import { response } from 'express';
import { categories, transactions } from '../models/model.js';
import { Group, User } from '../models/User.js';
import {
	handleDateFilterParams,
	handleAmountFilterParams,
	verifyAuth,
	verifyMultipleAuth,
} from './utils.js';
import jwt from 'jsonwebtoken';

/** OK
 * Create a new category
  - Request Body Content: An object having attributes `type` and `color`
  - Response `data` Content: An object having attributes `type` and `color`
 */
export const createCategory = (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

		const { type, color } = req.body;
		if (!type || !color) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		if (type === '' || color === '') {
			return res.status(400).json({ error: 'Invalid parameters' });
		}
		const new_categories = new categories({ type, color });
		categories.findOne({ type }).then((data) => {
			if (data) {
				return res.status(400).json({ error: 'Category already exists' });
			}
		});
		new_categories
			.save()
			.then((data) => {
				res.status(200).json({
					data: {
						type: data.type,
						color: data.color,
					},
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Edit a category's type or color
  - Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Optional behavior:
    - error 401 returned if the specified category does not exist
    - error 401 is returned if new parameters have invalid values
 */
export const updateCategory = async (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

		const { type, color } = req.body;
		const { type: oldType } = req.params;
		if (!type || !color) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		if (type === '' || color === '') {
			return res.status(400).json({ error: 'Invalid parameters' });
		}
		let checkParamCategory = await categories.findOne({ type: oldType });
		if (!checkParamCategory) {
			return res.status(400).json({ error: 'Category does not exist' });
		}
		//check if parameters category exists
		let checkBodyCategory = await categories.findOne({ type });
		if (checkBodyCategory) {
			return res.status(400).json({ error: 'Category already exists' });
		}
		//update transactions
		const typeTransactions = await transactions.find({ type: oldType });
		transactions
			.updateMany({ type: oldType }, { $set: { type } })
			.then((result) => {
				//update category
				categories
					.updateOne({ type: oldType }, { $set: { type, color } })
					.then((result) => {
						res.status(200).json({
							data: {
								message: 'Category edited successfully',
								count: typeTransactions.count,
							},
							refreshedTokenMessage: res.locals.refreshedTokenMessage,
						});
					})
					.catch((err) => {
						throw err;
					});
			})
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Delete a category
  - Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Response `data` Content: An object with parameter `message` that confirms successful deletion and a parameter `count` that is equal to the count of affected transactions (deleting a category sets all transactions with that category to have `investment` as their new category)
  - Optional behavior:
    - error 401 is returned if the specified category does not exist
 */
export const deleteCategory = async (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

		const { types } = req.body;
		if (!types) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		if (types === '') {
			return res.status(400).json({ error: 'Invalid parameters' });
		}
		let checkCategoriesNumber = await categories.find();
		if (checkCategoriesNumber.length == 1) {
			return res.status(400).json({ error: 'Only one category remaining!' });
		}

		let responseData = {
			message: 'Categories deleted',
			count: 0,
		};

		for (const type of types) {
			let data = await categories.findOne({ type });
			if (!data) {
				return res.status(400).json({ error: 'Category does not exist' });
			}

			const typeTransactions = await transactions.find({ type });
			responseData.count += typeTransactions.length;

			await transactions.updateMany({ type }, { $set: { type: 'investment' } });
			await data.remove();
		}

		res.status(200).json({
			data: responseData,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - empty array is returned if there are no categories
 */
export const getCategories = async (req, res) => {
	try {
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		let data = await categories.find({});

		let filter = data.map((v) =>
			Object.assign({}, { type: v.type, color: v.color })
		);

		return res.status(200).json({
			data: filter,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
    - error 401 is returned if the username or the type of category does not exist
 */
export const createTransaction = async (req, res) => {
	try {
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		const { username, amount, type } = req.body;

		const typeLook = await categories.findOne({ type: type }).exec();
		if (!typeLook) {
			return res.status(400).json({ error: 'Category does not exist' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ error: 'User does not exist' });
		}

		const new_transactions = new transactions({ username, amount, type });
		new_transactions
			.save()
			.then((data) =>
				res.status(200).json({
					data: {
						username: data.username,
						amount: data.amount,
						type: data.type,
						date: data.date,
					},
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - empty array must be returned if there are no transactions
 */
export const getAllTransactions = async (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized)
			return res.status(401).json({ error: 'Not Authorized' });
		/**
		 * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type"
		 */
		transactions
			.aggregate([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{ $unwind: '$joinedData' },
			])
			.then((result) => {
				let data = result.map((v) =>
					Object.assign(
						{},
						{
							username: v.username,
							amount: v.amount,
							type: v.type,
							date: v.date,
							color: v.joinedData.color,
						}
					)
				);
				res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK (ADMIN) - OK (USER)
 * Return all transactions made by a specific user
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the user does not exist
    - empty array is returned if there are no transactions made by the user
    - if there are query parameters and the function has been called by a Regular user then the returned transactions must be filtered according to the query parameters
 */
/*
- Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario/transactions` (user route)
  - Example: `/api/transactions/users/Mario` (admin route)
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Example: `res.status(200).json({data: [{username: "Mario", amount: 100, type: "food", date: "2023-05-19T00:00:00", color: "red"}, {username: "Mario", amount: 70, type: "health", date: "2023-05-19T10:00:00", color: "green"} ] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) if the route is `/api/users/:username/transactions`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `/api/transactions/users/:username`
- Can be filtered by date and amount if the necessary query parameters are present and if the route is `/api/users/:username/transactions
*/
export const getTransactionsByUser = async (req, res) => {
	try {
		const cookie = req.cookies;
		const username = req.params.username;
		if (username === undefined) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ error: 'User does not exist' });
		}
		const decodedRefreshToken = jwt.verify(
			cookie.refreshToken,
			process.env.ACCESS_KEY
		);
		if (username !== decodedRefreshToken.username) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		if (req.url.indexOf('/transactions/users/') >= 0) {
			//Admin
			let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
			if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

			try {
				const cookie = req.cookies;
				if (!cookie.accessToken) {
					return res.status(401).json({ error: 'Unauthorized' }); // unauthorized
				}

				transactions
					.aggregate([
						{
							$lookup: {
								from: 'categories',
								localField: 'type',
								foreignField: 'type',
								as: 'joinedData',
							},
						},
						{
							$unwind: '$joinedData',
						},
						{
							$match: {
								username: username,
							},
						},
					])
					.then((result) => {
						let data = result.map((v) =>
							Object.assign(
								{},
								{
									username: v.username,
									amount: v.amount,
									type: v.type,
									date: v.date,
									color: v.joinedData.color,
								}
							)
						);
						if (data.length === 0) {
							return res.status(200).json([]);
						}
						res.status(200).json({
							data: data,
							refreshedTokenMessage: res.locals.refreshedTokenMessage,
						});
					})
					.catch((error) => {
						throw error;
					});
			} catch (error) {
				res.status(400).json({ error: error });
			}
		} else {
			//User
			let UserAuth = verifyAuth(req, res, { authType: 'User' });
			if (!UserAuth.authorized) return res.status(401).json({ error: cause });

			try {
				if (req.query) {
					const filter = {
						username,
						...handleDateFilterParams(req),
						...handleAmountFilterParams(req),
					};
					let filteredTransactions = await transactions.find({
						username: username,
						...filter,
					});
					const allCategories = await categories.find();
					let data = filteredTransactions.map((v) =>
						Object.assign(
							{},
							{
								username: v.username,
								amount: v.amount,
								type: v.type,
								date: v.date,
								color: allCategories.find((c) => c.type === v.type).color,
							}
						)
					);
					return res.status(200).json({
						data: data,
						refreshedTokenMessage: res.locals.refreshedTokenMessage,
					});
				}
				transactions
					.aggregate([
						{
							$lookup: {
								from: 'categories',
								localField: 'type',
								foreignField: 'type',
								as: 'joinedData',
							},
						},
						{
							$unwind: '$joinedData',
						},
						{
							$match: {
								username: username,
							},
						},
					])
					.then((result) => {
						let data = result.map((v) =>
							Object.assign(
								{},
								{
									username: v.username,
									amount: v.amount,
									type: v.type,
									date: v.date,
									color: v.joinedData.color,
								}
							)
						);
						if (data.length === 0) {
							return res.status(200).json([]);
						}
						res.status(200).json({
							data: data,
							refreshedTokenMessage: res.locals.refreshedTokenMessage,
						});
					})
					.catch((error) => {
						throw error;
					});
			} catch (error) {
				res.status(400).json({ error: error });
			}
		}
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Return all transactions made by a specific user filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Optional behavior:
    - empty array is returned if there are no transactions made by the user with the specified category
    - error 401 is returned if the user or the category does not exist
 */
export const getTransactionsByUserByCategory = async (req, res) => {
	try {
		const cookie = req.cookies;
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		const username = req.params.username;
		if (username === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}
		const decodedRefreshToken = jwt.verify(
			cookie.refreshToken,
			process.env.ACCESS_KEY
		);
		if (
			username !== decodedRefreshToken.username &&
			decodedRefreshToken.role !== 'Admin'
		) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const type = req.params.category;
		if (type === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}

		const typeLook = await categories.findOne({ type: type }).exec();
		if (!typeLook) {
			return res.status(400).json({ error: 'Category does not exist' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ error: 'User does not exist' });
		}

		/**
		 * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type AND transactions.username = categories.username AND transactions.type = categoryVar AND transactions.username = usernameVar" still need to check if category exists
		 */
		const categoryVar = type;
		const usernameVar = username;

		transactions
			.aggregate([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{
					$unwind: '$joinedData',
				},
				{
					$match: {
						'joinedData.type': categoryVar,
						username: usernameVar,
					},
				},
			])
			.then((result) => {
				let data = result.map((v) =>
					Object.assign(
						{},
						{
							username: v.username,
							amount: v.amount,
							type: v.type,
							date: v.date,
							color: v.joinedData.color,
						}
					)
				);
				res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
	try {
		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ error: 'Group not found.' });
		}

		const { authorized, cause } = verifyAuth(req, res, { authType: 'Group', groupEmails: group.members.map((m) => m.email) });
		if (!authorized) return res.status(401).json({ error: cause });

		if (req.url.indexOf('transactions/groups') >= 0) {
			let { AdminAuth, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!AdminAuth.authorized) return res.status(401).json({ error: cause });
		}

		const name = req.params.name;
		if (name === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}



		const memberEmails = group.members.map((member) => member.email);
		console.log('emails:', memberEmails);

		const usernames = await User.find({
			email: { $in: memberEmails },
		}).distinct('username');
		console.log('usernames:', usernames);

		transactions
			.aggregate([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{
					$unwind: '$joinedData',
				},
			])
			.then((result) => {
				let data = result
					.filter((item) => usernames.includes(item.username))
					.map((v) =>
						Object.assign(
							{},
							{
								username: v.username,
								amount: v.amount,
								type: v.type,
								date: v.date,
								color: v.joinedData.color,
							}
						)
					);
				res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				res.json({ error: error }).status(401);
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 401 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
	try {
		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ error: 'Group not found.' });
		}
		if (req.url.indexOf('transactions/groups') >= 0) {
			let { AdminAuth, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!AdminAuth.authorized) return res.status(401).json({ error: cause });
		} else {
			const { authorized, cause } = verifyAuth(req, res, { authType: 'Group', groupEmails: group.members.map((m) => m.email) });
			if (!authorized) return res.status(401).json({ error: cause });
		}
		const name = req.params.name;
		if (name === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}
		const type2 = req.params.category;
		if (type2 === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}
		const typeLook = await categories.findOne({ type: type2 }).exec();
		if (!typeLook) {
			return res.status(400).json({ error: 'Category does not exist' });
		}

		const memberEmails = group.members.map((member) => member.email);

		const usernames = await User.find({
			email: { $in: memberEmails },
		}).distinct('username');

		const type = req.params.category;
		const categoryVar = type;

		transactions
			.aggregate([
				{
					$lookup: {
						from: 'categories',
						localField: 'type',
						foreignField: 'type',
						as: 'joinedData',
					},
				},
				{
					$unwind: '$joinedData',
				},
				{
					$match: {
						'joinedData.type': categoryVar,
					},
				},
			])
			.then((result) => {
				let data = result
					.filter((item) => usernames.includes(item.username))
					.map((v) =>
						Object.assign(
							{},
							{
								username: v.username,
								amount: v.amount,
								type: v.type,
								date: v.date,
								color: v.joinedData.color,
							}
						)
					);
				res.status(200).json({
					data: data,
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				});
			})
			.catch((error) => {
				res.json({ error: error }).status(401);
			});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
    - error 401 is returned if the user or the transaction does not exist
 */
export const deleteTransaction = async (req, res) => {
	try {
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		const username = req.params.username;
		const id = req.body._id;

		if (id === undefined) {
			return res.status(400).json({ error: 'Missing parameters' });
		}

		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ error: 'User does not exist' });
		}

		const idLook = await transactions.findOne({ _id: id }).exec();
		if (!idLook) {
			return res.status(400).json({ error: 'Transaction not found.' });
		}
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(400).json({ error: cause });

		let data = await transactions.deleteOne({ _id: req.body._id });
		return res.status(200).json({
			data: { message: 'Transaction deleted' },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(400).json({ error: error });
	}
};

/** OK
 * Delete multiple transactions identified by their ids
  - Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 401 is returned if at least one of the `_ids` does not have a corresponding transaction. Transactions that have an id are not deleted in this case
 */
export const deleteTransactions = async (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

		const idList = req.body._ids;

		if (!idList) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		for (let i = 0; i < idList.length; i++) {
			if (idList[i] == '') {
				return res.status(400).json({ error: 'Empty parameter' });
			}
		}

		if (idList.length > 0) {
			const existingTransactions = await transactions.find({
				_id: { $in: idList },
			});

			if (existingTransactions.length < idList.length) {
				return res.status(400).json({ error: 'One or more id not found' });
			}

			let data = await transactions.deleteMany({ _id: { $in: idList } });

			res.json({
				data: { message: 'Transactions deleted successfully' },
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			});
		} else {
			return res.status(400).json({ error: 'Id list is empty!' });
		}
	} catch (error) {
		res.status(400).json({ error: 'Transactions not found' });
	}
};
