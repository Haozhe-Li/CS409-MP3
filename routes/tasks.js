var Task = require('../models/task.js');
var User = require('../models/user.js');
var mongoose = require('mongoose');

module.exports = function(router) {

    /**
     * @api {post} /api/tasks Create a new task
     * @apiName PostTask
     * @apiGroup Tasks
     *
     * @apiParam {String} name Name of the task (required).
     * @apiParam {Date} deadline Deadline of the task (required).
     * @apiParam {String} [description] Description.
     * @apiParam {Boolean} [completed] Completion status (default: false).
     * @apiParam {String} [assignedUser] ID of the user this task is assigned to (default: "").
     * @apiParam {String} [assignedUserName] Name of the user (default: "unassigned").
     *
     * @apiSuccess (201) {String} message "Task created!"
     * @apiSuccess (201) {Object} data The newly created task object.
     *
     * @apiError (400) {String} message "Validation Error: [details]"
     * @apiError (400) {Object} data Empty array.
     * @apiError (500) {String} message "Server error: [details]"
     * @apiError (500) {Object} data Empty array.
     */
    router.route('/tasks')
        .post(async (req, res) => {
            try {
                if (!req.body.name || !req.body.deadline) {
                    return res.status(400).json({
                        message: "Validation Error: 'name' and 'deadline' are required fields.",
                        data: []
                    });
                }

                const task = new Task();
                task.name = req.body.name;
                task.deadline = req.body.deadline;

                if (req.body.description) task.description = req.body.description;
                if (req.body.completed) task.completed = req.body.completed;
                if (req.body.assignedUser) task.assignedUser = req.body.assignedUser;
                if (req.body.assignedUserName) task.assignedUserName = req.body.assignedUserName;

                const savedTask = await task.save();

                if (savedTask.assignedUser && !savedTask.completed) {
                    await User.findByIdAndUpdate(
                        savedTask.assignedUser, {
                            $push: {
                                pendingTasks: savedTask._id
                            }
                        }
                    );
                }

                res.status(201).json({
                    message: "Task created!",
                    data: savedTask
                });

            } catch (err) {
                let message = "Server error.";
                let status = 500;

                if (err.name === 'ValidationError') {
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
         * @api {get} /api/tasks Get all tasks
         * @apiName GetTasks
         * @apiGroup Tasks
         *
         * @apiParam {String} [where] JSON string to filter results.
         * @apiParam {String} [sort] JSON string to sort results.
         * @apiParam {String} [select] JSON string to select fields.
         * @apiParam {Number} [skip] Number of results to skip.
         * @apiParam {Number} [limit] Number of results to return (default: 100).
         * @apiParam {Boolean} [count] If true, return only the count of documents.
         *
         * @apiSuccess (200) {String} message "OK"
         * @apiSuccess (200) {Object[]} data Array of task objects or a count number.
         *
         * @apiError (400) {String} message "Bad Request: Invalid JSON in query parameter."
         * @apiError (400) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .get(async (req, res) => {
            try {
                let where, sort, select, skip, limit;

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
                limit = req.query.limit ? parseInt(req.query.limit) : 100; // Default 100
                const count = req.query.count === 'true';

                if (count) {
                    const countResult = await Task.countDocuments(where);
                    return res.status(200).json({
                        message: "OK",
                        data: countResult
                    });
                }

                let query = Task.find(where);
                if (sort) query = query.sort(sort);
                if (select) query = query.select(select);
                if (skip) query = query.skip(skip);
                if (limit) query = query.limit(limit);

                const tasks = await query.exec();

                res.status(200).json({
                    message: "OK",
                    data: tasks
                });

            } catch (err) {
                res.status(500).json({
                    message: "Server error: " + err.message,
                    data: []
                });
            }
        });


    /**
     * @api {get} /api/tasks/:id Get a specific task
     * @apiName GetTaskById
     * @apiGroup Tasks
     *
     * @apiParam {String} id Task's unique ID.
     * @apiParam {String} [select] JSON string to select fields.
     *
     * @apiSuccess (200) {String} message "OK"
     * @apiSuccess (200) {Object} data The task object.
     *
     * @apiError (400) {String} message "Bad Request: Invalid JSON in 'select' query parameter."
     * @apiError (400) {Object} data Empty array.
     * @apiError (404) {String} message "Task not found."
     * @apiError (404) {Object} data Empty array.
     * @apiError (500) {String} message "Server error: [details]"
     * @apiError (500) {Object} data Empty array.
     */
    router.route('/tasks/:id')
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

                let query = Task.findById(req.params.id);
                if (Object.keys(select).length > 0) {
                    query = query.select(select);
                }

                const task = await query.exec();

                if (!task) {
                    return res.status(404).json({
                        message: "Task not found.",
                        data: []
                    });
                }

                res.status(200).json({
                    message: "OK",
                    data: task
                });

            } catch (err) {
                res.status(500).json({
                    message: "Server error: " + err.message,
                    data: []
                });
            }
        })
        /**
         * @api {put} /api/tasks/:id Update/Replace a specific task
         * @apiName PutTask
         * @apiGroup Tasks
         *
         * @apiParam {String} id Task's unique ID.
         *
         * @apiSuccess (200) {String} message "Task updated!"
         * @apiSuccess (200) {Object} data The updated task object.
         *
         * @apiError (400) {String} message "Validation Error: [details]"
         * @apiError (400) {Object} data Empty array.
         * @apiError (404) {String} message "Task not found."
         * @apiError (404) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .put(async (req, res) => {
            const taskId = req.params.id;
            const newBody = req.body;

            try {
                const oldTask = await Task.findById(taskId);

                if (!oldTask) {
                    return res.status(404).json({
                        message: "Task not found.",
                        data: []
                    });
                }

                const updatedTask = await Task.findByIdAndUpdate(
                    taskId,
                    newBody, {
                        new: true,
                        runValidators: true
                    }
                );

                const oldUserId = oldTask.assignedUser;
                const newUserId = updatedTask.assignedUser;
                const wasCompleted = oldTask.completed;
                const isCompleted = updatedTask.completed;

                if (oldUserId !== newUserId) {
                    if (oldUserId) {
                        await User.findByIdAndUpdate(oldUserId, {
                            $pull: {
                                pendingTasks: taskId
                            }
                        });
                    }
                    if (newUserId && !isCompleted) {
                        await User.findByIdAndUpdate(newUserId, {
                            $push: {
                                pendingTasks: taskId
                            }
                        });
                    }
                }
                else if (newUserId && wasCompleted !== isCompleted) {
                    if (isCompleted) {
                        await User.findByIdAndUpdate(newUserId, {
                            $pull: {
                                pendingTasks: taskId
                            }
                        });
                    } else {
                        await User.findByIdAndUpdate(newUserId, {
                            $push: {
                                pendingTasks: taskId
                            }
                        });
                    }
                }

                res.status(200).json({
                    message: "Task updated!",
                    data: updatedTask
                });

            } catch (err) {
                let message = "Server error.";
                let status = 500;

                if (err.name === 'ValidationError') {
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
         * @api {delete} /api/tasks/:id Delete a specific task
         * @apiName DeleteTask
         * @apiGroup Tasks
         *
         * @apiParam {String} id Task's unique ID.
         *
         * @apiSuccess (200) {String} message "Task deleted!"
         * @apiSuccess (200) {Object} data The deleted task object.
         *
         * @apiError (404) {String} message "Task not found."
         * @apiError (404) {Object} data Empty array.
         * @apiError (500) {String} message "Server error: [details]"
         * @apiError (500) {Object} data Empty array.
         */
        .delete(async (req, res) => {
            try {
                const deletedTask = await Task.findByIdAndDelete(req.params.id);

                if (!deletedTask) {
                    return res.status(404).json({
                        message: "Task not found.",
                        data: []
                    });
                }

                if (deletedTask.assignedUser) {
                    await User.findByIdAndUpdate(
                        deletedTask.assignedUser, {
                            $pull: {
                                pendingTasks: deletedTask._id
                            }
                        }
                    );
                }

                res.status(200).json({
                    message: "Task deleted!",
                    data: deletedTask
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
