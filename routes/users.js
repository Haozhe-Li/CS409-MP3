var User = require('../models/user.js');
var Task = require('../models/task.js');

module.exports = function(router) {

    /**
     * @api {post} /api/users Create a new user
     * @apiName PostUser
     * @apiGroup Users
     *
     * @apiParam {String} name Name of the user (required).
     * @apiParam {String} email Email of the user (required, unique).
     * @apiParam {String[]} [pendingTasks] Array of Task IDs.
     *
     * @apiSuccess (201) {String} message "User created!"
     * @apiSuccess (201) {Object} data The newly created user object.
     *
     * @apiError (400) {String} message "Validation Error: [details]" or "Email already exists."
     * @apiError (400) {Object} data Empty array.
     * @apiError (500) {String} message "Server error: [details]"
     * @apiError (500) {Object} data Empty array.
     */
    router.route('/users')
        .post(async (req, res) => {
            try {
                // Validation: Check for required fields
                if (!req.body.name || !req.body.email) {
                    return res.status(400).json({
                        message: "Validation Error: 'name' and 'email' are required fields.",
                        data: []
                    });
                }

                const user = new User();
                user.name = req.body.name;
                user.email = req.body.email;
                if (req.body.pendingTasks) {
                    user.pendingTasks = req.body.pendingTasks;
                }
                // dateCreated is set by default in the schema

                await user.save();

                res.status(201).json({
                    message: "User created!",
                    data: user
                });

            } catch (err) {
                let message = "Server error.";
                let status = 500;

                if (err.code === 11000) { // Mongoose duplicate key error
                    status = 400;
                    message = "Email already exists.";
                } else if (err.name === 'ValidationError') {
                    status = 400;
                    message = "Validation Error: " + err.message;
                }

                res.status(status).json({
                    message: message,
                    data: []
                });
            }
        })
        /**
         * @api {get} /api/users Get all users
         * @apiName GetUsers
         * @apiGroup Users
         *
         * @apiParam {String} [where] JSON string to filter results (e.g., `{"name":"John"}`).
         * @apiParam {String} [sort] JSON string to sort results (e.g., `{"name": 1}`).
         * @apiParam {String} [select] JSON string to select fields (e.g., `{"name": 1, "email": 1}`).
         * @apiParam {Number} [skip] Number of results to skip.
         * @apiParam {Number} [limit] Number of results to return (default: unlimited).
         * @apiParam {Boolean} [count] If true, return only the count of documents.
         *
         * @apiSuccess (200) {String} message "OK"
         * @apiSuccess (200) {Object[]} data Array of user objects or a count number.
         *
         * @apiError (400) {String} message "Bad Request: Invalid JSON in query parameter."
         * @apiError (400) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .get(async (req, res) => {
            try {
                let where, sort, select, skip, limit;

                // --- Parse Query Parameters ---
                try {
                    where = req.query.where ? JSON.parse(req.query.where) : {};
                    sort = req.query.sort ? JSON.parse(req.query.sort) : {};
                    select = req.query.select ? JSON.parse(req.query.select) : {};
                } catch (e) {
                    return res.status(400).json({
                        message: "Bad Request: Invalid JSON in 'where', 'sort', or 'select' query parameter.",
                        data: []
                    });
                }

                skip = req.query.skip ? parseInt(req.query.skip) : 0;
                limit = req.query.limit ? parseInt(req.query.limit) : 0; // 0 = no limit
                const count = req.query.count === 'true';
                // --- End Parse Query Parameters ---

                if (count) {
                    const countResult = await User.countDocuments(where);
                    return res.status(200).json({
                        message: "OK",
                        data: countResult
                    });
                }

                // Build query
                let query = User.find(where);
                if (sort) query = query.sort(sort);
                if (select) query = query.select(select);
                if (skip) query = query.skip(skip);
                if (limit) query = query.limit(limit);

                const users = await query.exec(); // Use exec() to execute the query

                res.status(200).json({
                    message: "OK",
                    data: users
                });

            } catch (err) {
                console.log(err.name)
                if (err.name === 'CastError') {
                return res.status(404).json({
                    message: "User not found.",
                    data: []
                });
            }
                res.status(500).json({
                    message: "Server error: " + err.message,
                    data: []
                });
            }
        });


    /**
     * @api {get} /api/users/:id Get a specific user
     * @apiName GetUserById
     * @apiGroup Users
     *
     * @apiParam {String} id User's unique ID.
     * @apiParam {String} [select] JSON string to select fields (e.g., `{"name": 1, "email": 1}`).
     *
     * @apiSuccess (200) {String} message "OK"
     * @apiSuccess (200) {Object} data The user object.
     *
     * @apiError (400) {String} message "Bad Request: Invalid JSON in 'select' query parameter."
     * @apiError (400) {Object} data Empty array.
     * @apiError (404) {String} message "User not found."
     * @apiError (404) {Object} data Empty array.
     * @apiError (500) {String} message "Server error: [details]"
     * @apiError (500) {Object} data Empty array.
     */
    router.route('/users/:id')
        .get(async (req, res) => {
            try {
                let select;
                try {
                    select = req.query.select ? JSON.parse(req.query.select) : {};
                } catch (e) {
                    return res.status(400).json({
                        message: "Bad Request: Invalid JSON in 'select' query parameter.",
                        data: []
                    });
                }

                let query = User.findById(req.params.id);
                if (Object.keys(select).length > 0) {
                    query = query.select(select);
                }

                const user = await query.exec();

                if (!user) {
                    return res.status(404).json({
                        message: "User not found.",
                        data: []
                    });
                }

                res.status(200).json({
                    message: "OK",
                    data: user
                });

            } catch (err) {
                if (err.name === 'CastError') {
                return res.status(404).json({
                    message: "User not found.",
                    data: []
                });
            }
                res.status(500).json({
                    message: "Server error: " + err.message,
                    data: []
                });
            }
        })
        /**
         * @api {put} /api/users/:id Update/Replace a specific user
         * @apiName PutUser
         * @apiGroup Users
         *
         * @apiParam {String} id User's unique ID.
         * @apiParam {String} [name] Name of the user.
         * @apiParam {String} [email] Email of the user (unique).
         * @apiParam {String[]} [pendingTasks] Array of Task IDs.
         *
         * @apiSuccess (200) {String} message "User updated!"
         * @apiSuccess (200) {Object} data The updated user object.
         *
         * @apiError (400) {String} message "Validation Error: [details]" or "Email already exists."
         * @apiError (400) {Object} data Empty array.
         * @apiError (404) {String} message "User not found."
         * @apiError (404) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .put(async (req, res) => {
            try {
                // Find and update the user.
                // { new: true } returns the updated document.
                // { runValidators: true } ensures schema validations are run on update.
                const updatedUser = await User.findByIdAndUpdate(
                    req.params.id,
                    req.body, {
                        new: true,
                        runValidators: true,
                        context: 'query'
                    } // 'context' is needed for unique validator on update
                );

                if (!updatedUser) {
                    return res.status(404).json({
                        message: "User not found.",
                        data: []
                    });
                }

                res.status(200).json({
                    message: "User updated!",
                    data: updatedUser
                });

            } catch (err) {
                let message = "Server error.";
                let status = 500;

                if (err.code === 11000) {
                    status = 400;
                    message = "Email already exists.";
                } else if (err.name === 'ValidationError') {
                    status = 400;
                    message = "Validation Error: " + err.message;
                }

                res.status(status).json({
                    message: message,
                    data: []
                });
            }
        })
        /**
         * @api {delete} /api/users/:id Delete a specific user
         * @apiName DeleteUser
         * @apiGroup Users
         *
         * @apiParam {String} id User's unique ID.
         *
         * @apiSuccess (200) {String} message "User deleted!"
         * @apiSuccess (200) {Object} data The deleted user object.
         *
         * @apiError (404) {String} message "User not found."
         * @apiError (404) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .delete(async (req, res) => {
            try {
                const deletedUser = await User.findByIdAndDelete(req.params.id);

                if (!deletedUser) {
                    return res.status(404).json({
                        message: "User not found.",
                        data: []
                    });
                }

                // Requirement 7: Delete a User should unassign their pending tasks
                // We use pendingTasks array from the deleted user doc to be efficient
                if (deletedUser.pendingTasks && deletedUser.pendingTasks.length > 0) {
                    await Task.updateMany({
                        _id: {
                            $in: deletedUser.pendingTasks
                        }
                    }, {
                        $set: {
                            assignedUser: "",
                            assignedUserName: "unassigned"
                        }
                    });
                }

                res.status(200).json({
                    message: "User deleted! All associated tasks have been unassigned.",
                    data: deletedUser
                });

            } catch (err) {
                res.status(500).json({
                    message: "Server error: " + err.message,
                    data: []
                });
            }
        });

    return router;
};
