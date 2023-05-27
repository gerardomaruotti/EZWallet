import { response } from 'express';
import { categories, transactions } from '../models/model.js';
import { Group, User } from '../models/User.js';
import {
	handleDateFilterParams,
	handleAmountFilterParams,
	verifyAuth,
} from './utils.js';

/**
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
			return res.status(400).json({ message: 'Missing parameters' });
		}
		if (type === '' || color === '') {
			return res.status(400).json({ message: 'Invalid parameters' });
		}
		const new_categories = new categories({ type, color });
		categories.findOne({ type }).then((data) => {
			if (data) {
				return res.status(400).json({ message: 'Category already exists' });
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
		res.status(400).json({ error: error.message });
	}
};

/**
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
			return res.status(400).json({ message: 'Missing parameters' });
		}
		if (type === '' || color === '') {
			return res.status(400).json({ message: 'Invalid parameters' });
		}
		let checkParamCategory = await categories.findOne({ type: oldType });
		if (!checkParamCategory) {
			return res.status(400).json({ message: 'Category does not exist' });
		}
		//check if parameters category exists
		let checkBodyCategory = await categories.findOne({ type });
		if (checkBodyCategory) {
			return res.status(400).json({ message: 'Category already exists' });
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
		res.status(400).json({ error: error.message });
	}
};

/**
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
			return res.status(400).json({ message: 'Missing parameters' });
		}
		if (types === '') {
			return res.status(400).json({ message: 'Invalid parameters' });
		}
		let checkCategoriesNumber = await categories.find({ type: types });
		if (checkCategoriesNumber.length == 1) {
			return res.status(400).json({ message: 'Only one category remaining!' });
		}
		types.forEach(async (type) => {
			let data = await categories.findOne({ type });
			if (!data) {
				return res.status(400).json({ message: 'Category does not exist' });
			}
			let responseData = {
				message: 'Category deleted',
				count: 0,
			};
			const typeTransactions = await transactions.find({ type });
			responseData.count = typeTransactions.length;
			transactions
				.updateMany({ type }, { $set: { type: 'investment' } })
				.then((result) => {
					data.remove().then((data) =>
						res.status(200).json({
							data: responseData,
							refreshedTokenMessage: res.locals.refreshedTokenMessage,
						})
					); //warning
				});
		});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - empty array is returned if there are no categories
 */
export const getCategories = async (req, res) => {
	try {
		let UserAuth = verifyAuth(req, res, { authType: 'User' });
		if (!UserAuth.authorized) return res.status(401).json({ error: cause });

		let data = await categories.find({});

		let filter = data.map((v) =>
			Object.assign({}, { type: v.type, color: v.color })
		);

		return res.status(200).json({
			data: filter,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
    - error 401 is returned if the username or the type of category does not exist
 */
export const createTransaction = async (req, res) => {
	try {
		let UserAuth = verifyAuth(req, res, { authType: 'User' });
		if (!UserAuth.authorized) return res.status(401).json({ error: cause });

		const { username, amount, type } = req.body;

		const typeLook = await categories.findOne({ type: type }).exec();
		if (!typeLook) {
			return res.status(401).json({ message: 'Category does not exist' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(401).json({ message: 'User does not exist' });
		}

		const new_transactions = new transactions({ username, amount, type });
		new_transactions
			.save()
			.then((data) => res.json(data))
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - empty array must be returned if there are no transactions
 */
export const getAllTransactions = async (req, res) => {
	try {
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

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
						as: 'categories_info',
					},
				},
				{ $unwind: '$categories_info' },
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
				res.status(200).json(data);
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
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
		//Distinction between route accessed by Admins or Regular users for functions that can be called by both
		//and different behaviors and access rights
		const username = req.params.username;
		if (username === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(401).json({ message: 'User does not exist' });
		}
		if (req.url.indexOf('/transactions/users/') >= 0) {
			//Admin
			let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
			if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

			try {
				const cookie = req.cookies;
				if (!cookie.accessToken) {
					return res.status(401).json({ message: 'Unauthorized' }); // unauthorized
				}
				const username = req.params.username;
				/**
						 * MongoDB equivalent to the query "SELECT *
				FROM transactions
				LEFT JOIN categories ON transactions.type = categories.type
				WHERE username = usernameVar
				" still need to check if username exists. I also assume that you cant make a transaction with a non existing category
						 */
				const usernameVar = username;

				console.log('usernameVar:', usernameVar);

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
						if (data.length === 0) {
							return res.status(200).json([]);
						}
						res.status(200).json(data);
					})
					.catch((error) => {
						throw error;
					});
			} catch (error) {
				res.status(400).json({ error: error.message });
			}
		} else {
			//User
			let UserAuth = verifyAuth(req, res, { authType: 'User' });
			if (!UserAuth.authorized) return res.status(401).json({ error: cause });

			try {
				const cookie = req.cookies;
				if (!cookie.accessToken) {
					return res.status(401).json({ message: 'Unauthorized' }); // unauthorized
				}
				const username = req.params.username;
				/**
						 * MongoDB equivalent to the query "SELECT *
				FROM transactions
				LEFT JOIN categories ON transactions.type = categories.type
				WHERE username = usernameVar
				" still need to check if username exists. I also assume that you cant make a transaction with a non existing category
						 */
				const usernameVar = username;

				console.log('usernameVar:', usernameVar);

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
						if (data.length === 0) {
							return res.status(200).json([]);
						}
						res.status(200).json(data);
					})
					.catch((error) => {
						throw error;
					});
			} catch (error) {
				res.status(400).json({ error: error.message });
			}
		}
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Return all transactions made by a specific user filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Optional behavior:
    - empty array is returned if there are no transactions made by the user with the specified category
    - error 401 is returned if the user or the category does not exist
 */
export const getTransactionsByUserByCategory = async (req, res) => {
	try {
		const username = req.params.username;
		if (username === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}
		const type = req.params.category;
		if (type === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}

		const typeLook = await categories.findOne({ type: type }).exec();
		if (!typeLook) {
			return res.status(400).json({ message: 'Category does not exist' });
		}
		const userLook = await User.findOne({ username: username }).exec();
		if (!userLook) {
			return res.status(400).json({ message: 'User does not exist' });
		}
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(401).json({ error: cause });

		let UserAuth = verifyAuth(req, res, { authType: 'User' });
		if (!UserAuth.authorized) return res.status(401).json({ error: cause });

		/**
		 * MongoDB equivalent to the query "SELECT * FROM transactions, categories WHERE transactions.type = categories.type AND transactions.username = categories.username AND transactions.type = categoryVar AND transactions.username = usernameVar" still need to check if category exists
		 */
		const categoryVar = type;
		const usernameVar = username;

		console.log('categoryVar:', categoryVar);
		console.log('usernameVar:', usernameVar);

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
				res.status(200).json(data, usernameVar, categoryVar);
			})
			.catch((error) => {
				throw error;
			});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Group' });
		if (!authorized) return res.status(401).json({ message: cause });

		if (req.url.indexOf('transactions/groups') >= 0) {
			let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
			if (!AdminAuth.authorized) return res.status(401).json({ error: cause });
		}

		const name = req.params.name;
		if (name === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}

		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ message: 'Group not found.' });
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
				res.status(200).json(data);
			})
			.catch((error) => {
				res.json({ error: error.message }).status(401);
			});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 401 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Group' });
		if (!authorized) return res.status(401).json({ error: cause });
		const name = req.params.name;
		if (name === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}
		const type2 = req.params.category;
		if (type2 === undefined) {
			return res.status(401).json({ message: 'missing parameters' });
		}
		const typeLook = await categories.findOne({ type: type2 }).exec();
		if (!typeLook) {
			return res.status(400).json({ message: 'Category does not exist' });
		}

		const group = await Group.findOne({ name });
		if (!group) {
			return res.status(400).json({ message: 'Group not found.' });
		}

		const memberEmails = group.members.map((member) => member.email);
		console.log('emails:', memberEmails);

		const usernames = await User.find({
			email: { $in: memberEmails },
		}).distinct('username');
		console.log('usernames:', usernames);

		const type = req.params.category;
		const categoryVar = type;

		console.log('categoryVar:', categoryVar);
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
				res.status(200).json(data);
			})
			.catch((error) => {
				res.json({ error: error.message }).status(401);
			});
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
    - error 401 is returned if the user or the transaction does not exist
 */
export const deleteTransaction = async (req, res) => {
	try {
		const username2 = req.params.username;
		const id2 = req.params._id;

		const userLook = await User.findOne({ username: username2 }).exec();
		if (!userLook) {
			return res.status(401).json({ message: 'User does not exist' });
		}

		const idLook = await transactions.findOne({ _id: id2 }).exec();
		if (!idLook) {
			return res.status(400).json({ message: 'Transaction not found.' });
		}
		let AdminAuth = verifyAuth(req, res, { authType: 'Admin' });
		if (!AdminAuth.authorized) return res.status(400).json({ error: cause });

		let data = await transactions.deleteOne({ _id: req.body._id });
		return res.json('deleted');
	} catch (error) {
		res.status(400).json({ error: error.message });
	}
};

/**
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

		if (idList.length > 0) {
			const existingTransactions = await transactions.find({
				_id: { $in: idList },
			});

			if (existingTransactions.length < idList.length) {
				return res.status(401).json({ message: 'One or more id not found' });
			}

			let data = await transactions.deleteMany({ _id: { $in: idList } });

			res.json({
				data: 'Transactions deleted successfully',
			});
		} else {
			return res.status(401).json({ message: 'Id list is empty!' });
		}
	} catch (error) {
		res.status(400).json({ error: 'Transactions not found' });
	}
};
