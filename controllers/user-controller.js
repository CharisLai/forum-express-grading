const bcrypt = require('bcryptjs')
const { User, Restaurant, Comment, Favorite, Like, Followship } = require('../models')
const { imgurFileHandler } = require('../helpers/file-helpers')

const userController = {
    signUpPage: (req, res) => {
        res.render('signup')
    },
    signUp: (req, res, next) => {
        if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')

        User.findOne({ where: { email: req.body.email } })
            .then(user => {
                if (user) throw new Error('Email alreday exists!')
                return bcrypt.hash(req.body.password, 10)
            })
            .then(hash => User.create({
                name: req.body.name,
                email: req.body.email,
                password: hash
            }))
            .then(() => {
                req.flash('success_messages', '成功註冊帳號！')
                res.redirect('/signin')
            })
            .catch(err => next(err))
    },
    signInPage: (req, res) => {
        res.render('signin')
    },
    signIn: (req, res) => {
        req.flash('success_messages', '成功登入！')
        res.redirect('/restaurants')
    },
    logout: (req, res, next) => {
        req.logout(function (error) {
            if (error) {
                return next(error)
            }
            req.flash('success_messages', '登出成功！')
            res.redirect('/signin')
        })
    },
    getUser: (req, res, next) => {
        const id = req.params.id
        return Promise.all(
            [User.findByPk(id, { raw: true }),
            Comment.findAll({
                include: [Restaurant],
                raw: true,
                nest: true,
                where: { userId: req.params.id }
            })]
        )
            .then(([user, comments]) => {
                if (!user) throw new Error("User didn't exist!")
                return res.render('users/profile', { user, comments })
            })
            .catch(err => next(err))
    },
    editUser: (req, res, next) => {
        return User.findByPk(req.params.id, { raw: true })
            .then(user => {
                if (!user) throw new Error("User didn't exist!")
                res.render('users/edit', { user })
            })
            .catch(err => next(err))
    },
    putUser: (req, res, next) => {
        const id = req.params.id
        const userId = req.user?.id || id
        const { name } = req.body
        if (!name) throw new Error('User name is required!')
        const { file } = req
        return Promise.all([
            User.findByPk(userId),
            imgurFileHandler(file)
        ])
            .then(([user, filePath]) => {
                if (!user) throw new Error("User didn't exist!")
                return user.update({
                    name, image: filePath || user.image
                })
            })
            .then(() => {
                req.flash('success_messages', '使用者資料編輯成功')
                res.redirect(`/users/${userId}`)
            })
    },
    addFavorite: (req, res, next) => {
        const { restaurantId } = req.params
        return Promise.all([
            Restaurant.findByPk(restaurantId),
            Favorite.findOne({
                where: {
                    userId: req.user.id,
                    restaurantId
                }
            })
        ])
            .then(([restaurant, favorite]) => {
                if (!restaurant) throw new Error("Restaurant didn't exist!")
                if (favorite) throw new Error('You have favorited this restaurant!')
                return Favorite.create({
                    userId: req.user.id,
                    restaurantId
                })
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    },
    removeFavorite: (req, res, next) => {
        return Favorite.findOne({
            where: {
                userId: req.user.id,
                restaurantId: req.params.restaurantId
            }
        })
            .then(favorite => {
                if (!favorite) throw new Error("You haven't favorited this restaurant")

                return favorite.destroy()
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    },
    // Like
    addLike: (req, res, next) => {
        const { restaurantId } = req.params
        return Promise.all([
            Restaurant.findByPk(restaurantId),
            Like.findOne({
                where: {
                    userId: req.user.id,
                    restaurantId
                }
            })
        ])
            .then(([restaurant, like]) => {
                if (!restaurant) throw new Error("Restaurant didn't exist!")
                if (like) throw new Error('You have liked this restaurant!')
                return Like.create({
                    userId: req.user.id,
                    restaurantId
                })
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    },
    removeLike: (req, res, next) => {
        return Like.findOne({
            where: {
                userId: req.user.id,
                restaurantId: req.params.restaurantId
            }
        })
            .then(like => {
                if (!like) throw new Error("You haven't Liked this restaurant")

                return like.destroy()
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    },
    getTopUsers: (req, res, next) => {
        User.findAll({
            include: [{ model: User, as: 'Followers' }]
        })
            .then(users => {

            })
    },
    getTopUsers: (req, res, next) => {
        return User.findAll({
            include: [{ model: User, as: 'Followers' }]
        })
            .then(users => {
                const result = users
                    .map(user => ({
                        ...user.toJSON(),
                        followerCount: user.Followers.length,
                        isFollowed: req.user.Followings.some(f => f.id === user.id)
                    }))
                    .sort((a, b) => b.followerCount - a.followerCount)
                res.render('top-users', { users: result })
            })
            .catch(err => next(err))
    },
    addFollowing: (req, res, next) => {
        const { userId } = req.params
        Promise.all([
            User.findByPk(userId),
            Followship.findOne({
                where: {
                    followerId: req.user.id,
                    followingId: req.params.userId
                }
            })
        ])
            .then(([user, followship]) => {
                if (!user) throw new Error("User didn't exist!")
                if (followship) throw new Error('You are already following this user!')
                return Followship.create({
                    followerId: req.user.id,
                    followingId: userId
                })
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    },
    removeFollowing: (req, res, next) => {
        Followship.findOne({
            where: {
                followerId: req.user.id,
                followingId: req.params.userId
            }
        })
            .then(followship => {
                if (!followship) throw new Error("You haven't followed this user!")
                return followship.destroy()
            })
            .then(() => res.redirect('back'))
            .catch(err => next(err))
    }
}
module.exports = userController
