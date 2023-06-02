import { Group, User } from '../models/User.js';
import { transactions } from '../models/model.js';
import {
	verifyAuth,
	asyncFilter,
	verifyMultipleAuth,
	isEmail,
} from './utils.js';

/** OK
 * Return all the users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
  - Optional behavior:
    - empty array is returned if there are no users
 */
export const getUsers = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

		const users = (await User.find()).map((user) => {
			return {
				username: user.username,
				email: user.email,
			};
		});
		res.status(200).json({
			data: users,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OK
 * Return information of a specific user
  - Request Body Content: None
  - Response `data` Content: An object having attributes `username`, `email` and `role`.
  - Optional behavior:
    - error 401 is returned if the user is not found in the system
 */
export const getUser = async (req, res) => {
	try {
		const { authorized, cause } = verifyMultipleAuth(req, res, {
			authType: ['User', 'Admin'],
		});
		if (!authorized) return res.status(401).json({ error: cause });

		const user = await User.findOne({ username: req.params.username });
		if (!user) return res.status(400).json({ error: 'User not found' });
		const responseUser = {
			username: user.username,
			email: user.email,
			role: user.role,
		};

		res.status(200).json({
			data: responseUser,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Create a new group
  - Request Body Content: An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name`
    of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members
    (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email
    +does not appear in the system)
  - Optional behavior:
    - error 401 is returned if there is already an existing group with the same name
    - error 401 is returned if all the `memberEmails` either do not exist or are already in a group
 */
export const createGroup = async (req, res) => {
	try {
		let { name, memberEmails } = req.body;
		if (name === undefined || memberEmails === undefined)
			return res.status(400).json({ error: 'Missing parameters' });

		const { authorized, cause } = verifyAuth(req, res, { authType: 'Simple' });

		if (!authorized) return res.status(401).json({ error: cause });

		if (await Group.findOne({ name: name }))
			return res
				.status(401)
				.json({ error: 'A group with the same name already exists' });

		const { validEmails, alreadyInGroup, membersNotFound } =
			await checkGroupEmails(memberEmails);

		if (validEmails.length == 0)
			return res.status(400).json({ error: 'All the emails are invalid' });

		const members = await Promise.all(
			validEmails.map(async (e) => {
				return { email: e.email, user: await User.findOne({ email: e.email }) };
			})
		);

		const new_group = new Group({ name, members });
		new_group
			.save()
			.then((group) =>
				res.json({
					data: {
						group: {
							name: group.name,
							members: group.members.map((m) => ({ email: m.email })),
						},
						alreadyInGroup,
						membersNotFound,
					},
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Return all the groups
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group
    and an array for the `members` of the group
  - Optional behavior:
    - empty array is returned if there are no groups
 */
export const getGroups = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

		const groups = (await Group.find()).map((group) => {
			return {
				name: group.name,
				members: group.members.map((m) => ({ email: m.email })),
			};
		});
		res.status(200).json({
			data: groups,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Return information of a specific group
  - Request Body Content: None
  - Response `data` Content: An object having a string attribute for the `name` of the group and an array for the 
    `members` of the group
  - Optional behavior:
    - error 401 is returned if the group does not exist
 */
export const getGroup = async (req, res) => {
	try {
		const group = await Group.findOne({ name: req.params.name });
			if (!group) return res.status(400).json({ error: 'Group not found' });
		
		const { authorized, cause } = verifyMultipleAuth(req, res, {authType: ['Group', 'Admin'], groupEmails: group.members.map((m) => m.email)});
		if (!authorized) 
			return res.status(401).json({ error: cause });

		const responseGroup = {
			name: group.name,
			members: group.members.map((m) => ({ email: m.email })),
			members: group.members.map((m) => ({ email: m.email })),
		};
		res.status(200).json({
			data: responseGroup,
			refreshedTokenMessage: res.locals.refreshedTokenMessage,
		});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Add new members to a group
  - Request Body Content: An array of strings containing the emails of the members to add to the group
  - Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include the new members as well as the old ones), 
    an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - error 401 is returned if all the `memberEmails` either do not exist or are already in a group
 */
export const addToGroup = async (req, res) => {
	try {
		let { name } = req.params;
		let { memberEmails } = req.body;
		if (name === undefined || memberEmails === undefined)
			return res.status(400).json({
				error: 'The request body does not contain all the necessary attributes',
			});

		const group = await Group.findOne({ name: name })
		if (!group)
			return res.status(400).json({ error: 'Group not found' });

		if (req.path.split('/').slice(-1)[0] === 'add') {
			const { authorized, cause } = verifyAuth(req, res, { authType: 'Group', groupEmails: group.members.map((m) => m.email) });
			if (!authorized) return res.status(401).json({ error: cause });
		} else if (req.path.split('/').slice(-1)[0] === 'insert') {
			const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!authorized) return res.status(401).json({ error: cause });
		} else {
			return res.status(400).json({ error: 'Path not correct' });
		}
		
		if (memberEmails.some((email) => !isEmail(email)))
			return res.status(400).json({ error: 'Mail not correct formatted' });

		const { validEmails, alreadyInGroup, membersNotFound } = await checkGroupEmails(memberEmails);

		if (validEmails.length == 0)
			return res.status(400).json({ error: 'All the emails are invalid' });

		const membersToAdd = await Promise.all(
			validEmails.map(async (e) => {
				return { email: e.email, user: await User.findOne({ email: e.email }) };
			})
		);

		Group.updateOne(
			{ name: req.params.name },
			{ $push: { members: { $each: membersToAdd } } }
		)
			.then(async (group) =>
				res.json({
					data: {
						group: {
							name: name,
							members: (await Group.findOne({ name: name })).members.map(
								(m) => ({ email: m.email })
							),
						},
						alreadyInGroup,
						membersNotFound,
					},
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Remove members from a group
  - Request Body Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the
    created group and an array for the `members` of the group, this array must include only the remaining members),
    an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists 
    the `membersNotFound` (members whose email does not appear in the system)
  - Optional behavior:
    - error 401 is returned if the group does not exist
    - error 401 is returned if all the `memberEmails` either do not exist or are not in the group
 */
export const removeFromGroup = async (req, res) => {
	try {
		let { name } = req.params;
		let { memberEmails } = req.body;
		if (memberEmails === undefined)
			return res.status(401).json({ error: 'Missing parameters' });

		const group = await Group.findOne({ name: name });
		if (!group)
			return res.status(401).json({ error: 'Group not found' });

		if (req.path.split('/').slice(-1)[0] === 'remove') {
			const { authorized, cause } = verifyAuth(req, res, { authType: 'Group', groupEmails: group.members.map((m) => m.email) });
			if (!authorized) return res.status(401).json({ error: cause });
		} else if (req.path.split('/').slice(-1)[0] === 'pull') {
			const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
			if (!authorized) return res.status(401).json({ error: cause });
		} else {
			return res.status(400).json({ error: 'Path not correct' });
		}

		if (memberEmails.some((email) => !isEmail(email)))
			return res.status(400).json({ error: 'Mail not correct formatted' });

		const { validEmails, membersNotFound, notInGroup } = await checkGroupEmails(
			memberEmails,
			name
		);

		if (validEmails.length == 0)
			return res.status(401).json({ error: 'All the emails are invalid' });

		if (group.members.length <= validEmails.length)
			return res.status(401).json({ error: 'Group will be empty after removing members' });

		Group.updateOne(
				{ name: name },
				{ $pull: { members: { email: { $in: validEmails.map((e) => e.email)} } } })
			.then(async (group) =>
				res.json({
					data: {
						group: {
							name: name,
							members: (await Group.findOne({ name: name })).members.map(
								(m) => ({
									email: m.email,
								})
							),
						},
						notInGroup,
						membersNotFound,
					},
					refreshedTokenMessage: res.locals.refreshedTokenMessage,
				})
			)
			.catch((err) => {
				throw err;
			});
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Delete a user
  - Request Parameters: None
  - Request Body Content: A string equal to the `email` of the user to be deleted
  - Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and a boolean attribute that
    specifies whether the user was also `deletedFromGroup` or not.
  - Optional behavior:
    - error 401 is returned if the user does not exist 
 */
export const deleteUser = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

		const email = req.body.email;
		if (email === undefined)
			return res.status(400).json({ error: 'Missing parameters' });

		if (!isEmail(email)) {
			return res.status(400).json({ error: 'Mail not correct formatted' });
		}

		const user = await User.findOne({ email: email });
		if (!user) return res.status(400).json({ error: 'User not found' });

		const deletedTransactions = await transactions.deleteMany({
			email: email,
		});

		const group = await Group.findOne({ 'members.email': email });

		let deletedGroup;
		if(group.members.length == 1) {
			deletedGroup = await Group.deleteMany({
				name: group.name,
			});
		} else {
			deletedGroup = await Group.updateOne(
				{ name: group.name },
				{ $pull: { members: { email: email } } }
			);
		}

		await User.deleteMany({ email: email });

		const response = {
			data: {
				deletedTransaction: deletedTransactions.deletedCount,
				deleteFromGroup: deletedGroup.modifiedCount > 0 || deletedGroup.deletedCount > 0,
				refreshedTokenMessage: res.locals.refreshedTokenMessage,
			},
		};
		res.json(response).status(200);
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/** OKOK
 * Delete a group
  - Request Body Content: A string equal to the `name` of the group to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
    - error 401 is returned if the group does not exist
 */
export const deleteGroup = async (req, res) => {
	try {
		const { authorized, cause } = verifyAuth(req, res, { authType: 'Admin' });
		if (!authorized) return res.status(401).json({ error: cause });

		let { name } = req.body;
		if (name === undefined)
			return res.status(400).json({ error: 'Missing parameters' });

		if (name === '') return res.status(400).json({ error: 'Empty name' });

		const deletedGroup = await Group.deleteMany({
			name: req.body.name,
		});

		if (deletedGroup.deletedCount === 0)
			return res.status(400).json({ message: 'Group not found' });

		res.json({ message: 'Group deleted' }).status(200);
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

// This function takes in an array of member emails and a group name. It first filters out any emails that are not in the database, then checks if they are in the group. If no group name is specified, it only checks if they are in any group. It returns an object with the valid emails, emails that are already in the group, emails that are not in the group, and emails that are not in the database.
const checkGroupEmails = async (memberEmails, groupName) => {
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

