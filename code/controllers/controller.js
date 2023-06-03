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
		let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

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
		res.status(500).json({ error: error.message });
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
		let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

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
						res.status(500).json({ error: error.message });
					});
			})
			.catch((err) => {
				res.status(500).json({ error: error.message });
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
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
		let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

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
		res.status(500).json({ error: error.message });
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
		res.status(500).json({ error: error.message });
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
		res.status(500).json({ error: error.message });
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
		let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

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
				res.status(500).json({ error: error.message });
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
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
export const getTransactionsByUser = async (req, res) => {
	try {
		const username = req.params.username;
		if (username === undefined) {
			return res.status(400).json({ error: 'Missing parameters' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ error: 'User does not exist' });
		}
		if (req.url.indexOf('/transactions/users/') >= 0) {
			//Admin
			let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!authorized) return res.status(401).json({ error: cause });

			try {
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
						res.status(500).json({ error: error.message });
					});
			} catch (error) {
				res.status(500).json({ error: error.message });
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
				res.status(500).json({ error: error.message });
			}
		}
	} catch (error) {
		res.status(500).json({ error: error.message });
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
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		const username = req.params.username;
		if (username === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
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
				res.status(500).json({ error: error.message });
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
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
		const name = req.params.name;
		if (name === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}

		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ error: 'Group not found.' });
		}

		const memberEmails = group.members.map((member) => member.email);

		const { authorized, cause } = verifyAuth(req, res, {
			authType: 'Group',
			groupEmails: memberEmails,
		});
		if (!authorized) return res.status(401).json({ error: cause });

		if (req.url.indexOf('transactions/groups') >= 0) {
			let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!authorized) return res.status(401).json({ error: cause });
		}

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
				res.status(500).json({ error: error.message });
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
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
		const name = req.params.name;
		if (name === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}
		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ error: 'Group not found.' });
		}
		const memberEmails = group.members.map((member) => member.email);
		if (req.url.indexOf('transactions/groups') >= 0) {
			let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!authorized) return res.status(401).json({ error: cause });
		} else {
			const { authorized, cause } = verifyAuth(req, res, {
				authType: 'Group',
				groupEmails: memberEmails,
			});
			if (!authorized) return res.status(401).json({ error: cause });
		}
		const type = req.params.category;
		if (type === undefined) {
			return res.status(400).json({ error: 'missing parameters' });
		}
		const typeLook = await categories.findOne({ type: type }).exec();
		if (!typeLook) {
			return res.status(400).json({ error: 'Category does not exist' });
		}

		const usernames = await User.find({
			email: { $in: memberEmails },
		}).distinct('username');

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
				res.status(500).json({ error: error.message });
			});
	} catch (error) {
		res.status(500).json({ error: error.message });
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

		let data = await transactions.deleteOne({ _id: req.body._id });
		return res.status(200).json({
			data: { message: 'Transaction deleted' },
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
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
		let { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

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
