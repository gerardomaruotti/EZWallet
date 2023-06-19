import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { verifyAuth, isEmail } from './utils.js';

/**
 * Register a new user in the system
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const register = async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (username === undefined || email === undefined || password === undefined)
			return res.status(400).json({ error: 'Missing parameters' });

		if (username === '' || email === '' || password === '')
			return res.status(400).json({ error: 'Empty string in parameters' });

		if (!isEmail(email))
			return res.status(400).json({ error: 'Email not correct formatted' });

		if (await User.findOne({ email: email }))
			return res.status(400).json({ error: 'User already registered' });

		if (await User.findOne({ username: username }))
			return res.status(400).json({ error: 'User already registered' });

		const hashedPassword = await bcrypt.hash(password, 12);
		await User.create({
			username,
			email,
			password: hashedPassword,
		});
		res.status(200).json({ data: { message: 'User added succesfully' } });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/**
 * Register a new user in the system with an Admin role
  - Request Body Content: An object having attributes `username`, `email` and `password`
  - Response `data` Content: A message confirming successful insertion
  - Optional behavior:
    - error 400 is returned if there is already a user with the same username and/or email
 */
export const registerAdmin = async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (username === undefined || email === undefined || password === undefined)
			return res.status(400).json({ error: 'Missing parameters' });

		if (username === '' || email === '' || password === '')
			return res.status(400).json({ error: 'Empty string in parameters' });

		if (!isEmail(email))
			return res.status(400).json({ error: 'Email not correct formatted' });

		if (
			(await User.findOne({ email: email })) ||
			(await User.findOne({ username: username }))
		)
			return res.status(400).json({ error: 'User already registered' });
		const hashedPassword = await bcrypt.hash(password, 12);
		await User.create({
			username,
			email,
			password: hashedPassword,
			role: 'Admin',
		});
		res.status(200).json({ data: { message: 'Admin added succesfully' } });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/**
 * Perform login 
  - Request Body Content: An object having attributes `email` and `password`
  - Response `data` Content: An object with the created accessToken and refreshToken
  - Optional behavior:
    - error 400 is returned if the user does not exist
    - error 400 is returned if the supplied password does not match with the one in the database
 */
export const login = async (req, res) => {
	const { email, password } = req.body;
	if (email === undefined || password === undefined)
		return res.status(400).json({ error: 'Missing parameters' });

	if (email === '' || password === '')
		return res.status(400).json({ error: 'Empty string in parameters' });

	try {
		const existingUser = await User.findOne({ email: email });
		if (!existingUser) return res.status(400).json({ error: 'User need to register' });

		const match = await bcrypt.compare(password, existingUser.password);
		if (!match) return res.status(400).json({ error: 'Wrong credentials' });
		//CREATE ACCESSTOKEN
		const accessToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: '1h' }
		);
		//CREATE REFRESH TOKEN
		const refreshToken = jwt.sign(
			{
				email: existingUser.email,
				id: existingUser.id,
				username: existingUser.username,
				role: existingUser.role,
			},
			process.env.ACCESS_KEY,
			{ expiresIn: '7d' }
		);
		//SAVE REFRESH TOKEN TO DB
		existingUser.refreshToken = refreshToken;
		const savedUser = await existingUser.save();
		res.cookie('accessToken', accessToken, {
			httpOnly: true,
			domain: 'localhost',
			path: '/api',
			maxAge: 60 * 60 * 1000,
			sameSite: 'none',
			secure: true,
		});
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			domain: 'localhost',
			path: '/api',
			maxAge: 7 * 24 * 60 * 60 * 1000,
			sameSite: 'none',
			secure: true,
		});
		res
			.status(200)
			.json({ data: { accessToken: accessToken, refreshToken: refreshToken } });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};

/**
 * Perform logout
  - Auth type: Simple
  - Request Body Content: None
  - Response `data` Content: A message confirming successful logout
  - Optional behavior:
    - error 400 is returned if the user does not exist
 */
export const logout = async (req, res) => {
	const refreshToken = req.cookies.refreshToken;
	if (!refreshToken) return res.status(400).json({ error: 'User not logged in'});

	try {
		const user = await User.findOne({ refreshToken: refreshToken });
		if (!user) return res.status(400).json({ error: 'User not found' });

		user.refreshToken = null;
		res.cookie('accessToken', '', {
			httpOnly: true,
			path: '/api',
			maxAge: 0,
			sameSite: 'none',
			secure: true,
		});
		res.cookie('refreshToken', '', {
			httpOnly: true,
			path: '/api',
			maxAge: 0,
			sameSite: 'none',
			secure: true,
		});
		await user.save();
		res.status(200).json({ data: { message: 'User logged out' } });
	} catch (error) {
		res.status(500).json({ error: error });
	}
};
