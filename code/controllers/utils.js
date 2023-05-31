import jwt from 'jsonwebtoken';
import { Group } from '../models/User.js';

/**
 * Handle possible date filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `date` parameter.
 *  The returned object must handle all possible combination of date filtering parameters, including the case where none are present.
 *  Example: {date: {$gte: "2023-04-30T00:00:00.000Z"}} returns all transactions whose `date` parameter indicates a date from 30/04/2023 (included) onwards
 * @throws an error if the query parameters include `date` together with at least one of `from` or `upTo`
 */
export const handleDateFilterParams = (req) => {
	const { date, from, upTo } = req.query;

	let filter = {};

	if (date && (from || upTo)) {
		throw new Error(
			'Cannot use `date` parameter together with `from` or `upTo`'
		);
	}

	if (date) {
		filter.date = { $gte: date };
	} else if (from && upTo) {
		filter.date = { $gte: from, $lte: upTo };
	} else if (from) {
		filter.date = { $gte: from };
	} else if (upTo) {
		filter.date = { $lte: upTo };
	}

	return filter;
};

/**
 * Handle possible authentication modes depending on `authType`
 * @param req the request object that contains cookie information
 * @param res the result object of the request
 * @param info an object that specifies the `authType` and that contains additional information, depending on the value of `authType`
 *      Example: {authType: "Simple"}
 *      Additional criteria:
 *          - authType === "User":
 *              - either the accessToken or the refreshToken have a `username` different from the requested one => error 401
 *              - the accessToken is expired and the refreshToken has a `username` different from the requested one => error 401
 *              - both the accessToken and the refreshToken have a `username` equal to the requested one => success
 *              - the accessToken is expired and the refreshToken has a `username` equal to the requested one => success
 *          - authType === "Admin":
 *              - either the accessToken or the refreshToken have a `role` which is not Admin => error 401
 *              - the accessToken is expired and the refreshToken has a `role` which is not Admin => error 401
 *              - both the accessToken and the refreshToken have a `role` which is equal to Admin => success
 *              - the accessToken is expired and the refreshToken has a `role` which is equal to Admin => success
 *          - authType === "Group":
 *              - either the accessToken or the refreshToken have a `email` which is not in the requested group => error 401
 *              - the accessToken is expired and the refreshToken has a `email` which is not in the requested group => error 401
 *              - both the accessToken and the refreshToken have a `email` which is in the requested group => success
 *              - the accessToken is expired and the refreshToken has a `email` which is in the requested group => success
 * @returns true if the user satisfies all the conditions of the specified `authType` and false if at least one condition is not satisfied
 *  Refreshes the accessToken if it has expired and the refreshToken is still valid
 */

export const verifyAuth = (req, res, info) => {
	const cookie = req.cookies;
	if (!cookie.accessToken || !cookie.refreshToken) {
		return { authorized: false, cause: 'Unauthorized' };
	}

	try {
		const decodedAccessToken = jwt.verify(
			cookie.accessToken,
			process.env.ACCESS_KEY
		);
		const decodedRefreshToken = jwt.verify(
			cookie.refreshToken,
			process.env.ACCESS_KEY
		);

		if (
			!decodedAccessToken.username ||
			!decodedAccessToken.email ||
			!decodedAccessToken.role
		) {
			return { authorized: false, cause: 'Token is missing information' };
		}
		if (
			!decodedRefreshToken.username ||
			!decodedRefreshToken.email ||
			!decodedRefreshToken.role
		) {
			return { authorized: false, cause: 'Token is missing information' };
		}
		if (
			decodedAccessToken.username !== decodedRefreshToken.username ||
			decodedAccessToken.email !== decodedRefreshToken.email ||
			decodedAccessToken.role !== decodedRefreshToken.role
		) {
			return { authorized: false, cause: 'Mismatched users' };
		}

		if (info.authType === 'User') {
			if (
				req.params.username !== undefined &&
				req.params.username !== decodedAccessToken.username
			) {
				return {
					authorized: false,
					cause: 'Requested user different from the logged one',
				};
			}
		} else if (info.authType === 'Admin') {
			if (decodedAccessToken.role !== 'Admin') {
				return { authorized: false, cause: 'Not admin' };
			}
		} else if (info.authType === 'Group') {
			//DA CONTROLLARE
			/*
			if(req.params.name !== undefined && !(await Group.findOne({name: req.params.name, 'members.email': decodedAccessToken.email}))) { 
				return { authorized: false, cause: 'User not in group' };
			}
			*/
		}

		return { authorized: true, cause: 'Authorized' };
	} catch (err) {
		if (err.name === 'TokenExpiredError') {
			try {
				const refreshToken = jwt.verify(
					cookie.refreshToken,
					process.env.ACCESS_KEY
				);
				const newAccessToken = jwt.sign(
					{
						username: refreshToken.username,
						email: refreshToken.email,
						id: refreshToken.id,
						role: refreshToken.role,
					},
					process.env.ACCESS_KEY,
					{ expiresIn: '1h' }
				);
				res.cookie('accessToken', newAccessToken, {
					httpOnly: true,
					path: '/api',
					maxAge: 60 * 60 * 1000,
					sameSite: 'none',
					secure: true,
				});
				res.locals.refreshedTokenMessage =
					'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls';
				return { authorized: true, cause: 'Authorized' };
			} catch (err) {
				if (err.name === 'TokenExpiredError') {
					return { authorized: false, cause: 'Perform login again' };
				} else {
					return { authorized: false, cause: err.name };
				}
			}
		} else {
			return { authorized: false, cause: err.name };
		}
	}
};

/**
 * Handle possible amount filtering options in the query parameters for getTransactionsByUser when called by a Regular user.
 * @param req the request object that can contain query parameters
 * @returns an object that can be used for filtering MongoDB queries according to the `amount` parameter.
 *  The returned object must handle all possible combination of amount filtering parameters, including the case where none are present.
 *  Example: {amount: {$gte: 100}} returns all transactions whose `amount` parameter is greater or equal than 100
 */
export const handleAmountFilterParams = (req) => {
	const username = req.params.username;
	const amount = req.body.amount;
	const usernameVar = username;
	const amountVar = amount;

	console.log('usernameVar:', usernameVar);

	let amountQuery = {};

	if (amountVar && Array.isArray(amountVar)) {
		for (const filter of amountVar) {
			const [operator, value] = filter.split(' ');
			const parsedValue = parseFloat(value);

			amountQuery[operator] = parsedValue;
		}
	}

	let aggregationPipeline = [
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
	];

	if (Object.keys(amountQuery).length > 0) {
		aggregationPipeline.push({
			$match: {
				amount: amountQuery,
			},
		});
	}

	transactions
		.aggregate(aggregationPipeline)
		.then((result) => {
			let data = result.map((v) =>
				Object.assign(
					{},
					{
						_id: v._id,
						username: v.username,
						amount: v.amount,
						type: v.type,
						color: v.joinedData.color,
						date: v.date,
					}
				)
			);
			return data;
		})
		.catch((error) => {
			throw error;
		});
};

// This function takes an array and a predicate function as arguments and returns a new array containing
// only the elements of the original array for which the predicate function returns a truthy value.

// It uses the built-in Array.prototype.map method to call the predicate function on each element of the
// array, returning an array of promises. It then uses Promise.all to wait for all of the promises to
// resolve before using the built-in Array.prototype.filter method to return only the elements of the
// original array for which the predicate function returned a truthy value.
export const asyncFilter = async (arr, predicate) => {
	const results = await Promise.all(arr.map(predicate));

	return arr.filter((_v, index) => results[index]);
};

export const verifyMultipleAuth = (req, res, info) => {
	let message = null;

	return {
		authorized: info.authType.some((type) => {
			const { authorized, cause } = verifyAuth(req, res, { authType: type });

			if (authorized) return true;
			if (message === null) {
				message = cause;
			} else {
				if (!message.includes(cause)) message += ' or ' + cause;
			}

			return false;
		}),
		cause: message,
	};
};

export const isEmail = (email) => {
	var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

	return email.match(validRegex) ? true : false;	
};
