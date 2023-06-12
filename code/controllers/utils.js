import jwt from 'jsonwebtoken';
import { Group, User } from '../models/User.js';

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

	if (from) {
		const fromDate = new Date(from);
		if (isNaN(fromDate.getTime())) {
			throw new Error('Invalid `from` parameter');
		}
		filter.date = { $gte: fromDate };
	}

	if (upTo) {
		const upToDate = new Date(upTo);
		if (isNaN(upToDate.getTime())) {
			throw new Error('Invalid `upTo` parameter');
		}
		if (filter.date) {
			filter.date.$lte = new Date(upToDate.getTime() + 24 * 60 * 60 * 1000 - 1);
		} else {
			filter.date = {
				$lt: new Date(upToDate.getTime() + 24 * 60 * 60 * 1000 - 1),
			};
		}
	}

	if (date) {
		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) {
			throw new Error('Invalid `date` parameter');
		}
		const startOfDay = new Date(
			dateObj.getFullYear(),
			dateObj.getMonth(),
			dateObj.getDate()
		);
		const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
		filter.date = { $gte: startOfDay, $lte: endOfDay };
	}
	if (Object.keys(filter).length === 0) {
		filter = {};
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
			if (
				!info.groupEmails ||
				!info.groupEmails.includes(decodedAccessToken.email)
			) {
				return { authorized: false, cause: 'User not in group' };
			}
		}

		return { authorized: true, cause: 'Authorized' };
	} catch (err) {
		if (err.name === 'TokenExpiredError' || err.message === 'jwt expired') {
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
 * @throws an error if the value of any of the two query parameters is not a numerical value
 */
export const handleAmountFilterParams = (req) => {
	const { min, max } = req.query;
	let filter = {};

	if (min && isNaN(min)) {
		throw new Error('Invalid `min` parameter');
	}

	if (max && isNaN(max)) {
		throw new Error('Invalid `max` parameter');
	}

	if (min) {
		filter.amount = { $gte: parseInt(min) };
	}

	if (max) {
		if (filter.amount) {
			filter.amount.$lte = parseInt(max);
		} else {
			filter.amount = { $lte: parseInt(max) };
		}
	}

	return filter;
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
			const { authorized, cause } = verifyAuth(req, res, {
				...info,
				authType: type,
			});

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
	var validRegex =
		/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

	return email.match(validRegex) ? true : false;
};

// This function takes in an array of member emails and a group name. It first filters out any emails that are not in the database, then checks if they are in the group. If no group name is specified, it only checks if they are in any group. It returns an object with the valid emails, emails that are already in the group, emails that are not in the group, and emails that are not in the database.
export const checkGroupEmails = async (memberEmails, groupName) => {
	let alreadyInGroup = [];
	let membersNotFound = [];
	let notInGroup = [];

	memberEmails = await asyncFilter(memberEmails, async (e) => {
		const result = await User.findOne({ email: e });
		if (!result) membersNotFound.push(e);
		return result;
	});

	if (groupName === undefined) {
		memberEmails = await asyncFilter(memberEmails, async (e) => {
			const result = await Group.findOne({ 'members.email': e });
			if (result) alreadyInGroup.push(e);
			return !result;
		});
	} else {
		memberEmails = await asyncFilter(memberEmails, async (e) => {
			const result = await Group.findOne({
				name: groupName,
				'members.email': e,
			});
			if (!result) notInGroup.push(e);
			return result;
		});
	}

	return {
		validEmails: memberEmails.map((email) => ({ email })),
		alreadyInGroup: alreadyInGroup.map((email) => ({ email })),
		membersNotFound: membersNotFound.map((email) => ({ email })),
		notInGroup: notInGroup.map((email) => ({ email })),
	};
};
