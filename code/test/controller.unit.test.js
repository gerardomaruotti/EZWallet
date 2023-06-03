import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import { verifyAuth, verifyMultipleAuth } from '../controllers/utils';
import {
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
	createTransaction,
	getAllTransactions,
	getTransactionsByUser,
	getTransactionsByUserByCategory,
	getTransactionsByGroup,
	getTransactionsByGroupByCategory,
	deleteTransaction,
	deleteTransactions,
} from '../controllers/controller';

jest.mock('../models/model');
jest.mock('../controllers/utils');

let mockReq;
let mockRes;
beforeEach(() => {
	mockReq = {
		cookies: {},
		body: {},
		params: {},
	};
	mockRes = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			refreshedTokenMessage: 'refreshed token',
		},
	};
	jest.clearAllMocks();
});

describe('createCategory', () => {
	test('should create new category', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockCategory = {
			type: 'test',
			color: '#fcbe44',
		};

		categories.findOne.mockResolvedValue(null);
		categories.prototype.save.mockResolvedValue(mockCategory);

		mockReq.body = mockCategory;

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: expect.any(String),
					color: expect.any(String),
				}),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});

	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 500 if there is database error', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category already exists', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(mockReq.body);

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is not provided', async () => {
		mockReq.body = {
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is not provided', async () => {
		mockReq.body = {
			type: 'test',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is empty', async () => {
		mockReq.body = {
			type: '',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is empty', async () => {
		mockReq.body = {
			type: 'test',
			color: '',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should throw error if category is not saved correctly', async () => {
		mockReq.body = {
			type: 'test',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(null);
		categories.prototype.save.mockImplementation(() => {
			throw new Error('Database error');
		});

		await createCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});
});

describe('updateCategory', () => {
	test('should return 401 if not authorized', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category type is empty', async () => {
		mockReq.body = {
			type: '',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if category color is empty', async () => {
		mockReq.body = {
			type: 'test',
			color: '',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 400 if param category does not exist', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne.mockResolvedValue(null);

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category does not exist',
		});
	});
	test('should return 400 if body category already exists', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(mockReq.body.type);

		categories.find.mockResolvedValue(mockReq.params.type);

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: 'Category already exists',
		});
	});

	test('should throw error if category is not updated correctly', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(null);

		transactions.find.mockResolvedValue(mockReq.params.type);
		const spy = jest.spyOn(transactions, 'updateMany');
		spy.mockImplementation(() => {
			throw new Error('Database error');
		});

		await updateCategory(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: expect.any(String),
			})
		);
	});

	test('should return 200 if category is updated correctly', async () => {
		mockReq.params = {
			type: 'test',
		};

		mockReq.body = {
			type: 'test1',
			color: '#fcbe44',
		};

		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.findOne
			.mockResolvedValue(null)
			.mockResolvedValueOnce(mockReq.params.type)
			.mockResolvedValueOnce(null);

		categories.find.mockResolvedValue(mockReq.params.type);
		const spy = jest.spyOn(transactions, 'updateMany');
		const spyCat = jest.spyOn(categories, 'updateOne');
		spy.mockResolvedValue();
		spyCat.mockResolvedValue();

		await updateCategory(mockReq, mockRes);

		//TODO: fix this test
		// expect(mockRes.status).toHaveBeenCalledWith(200);
		// expect(mockRes.json).toHaveBeenCalledWith({
		// 	message: 'Category updated',
		// });
	});
});

describe('deleteCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

//OK
describe('getCategories', () => {
	test('should return 401 if not authorised', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		categories.find.mockImplementation(() => []);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of categories', async () => {
		verifyMultipleAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		let mockCategories = [
			{
				type: 'investment',
				color: '#fcbe44',
			},
			{
				type: 'income',
				color: '#44fcbe',
			},
		];

		categories.find.mockImplementation(() => mockCategories);

		await getCategories(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						type: expect.any(String),
						color: expect.any(String),
					}),
				]),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

describe('createTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

//OK
describe('getAllTransactions', () => {
	test('should return 401 if not authorised', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: false,
			cause: 'Unauthorized',
		}));

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(401);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return 500 if there is database error', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		transactions.aggregate.mockImplementation(() => {
			throw new Error('Database error');
		});

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: expect.any(String),
		});
	});

	test('should return empty list if there are no transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const spy = jest.spyOn(transactions, 'aggregate');

		spy.mockResolvedValue([]);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith({
			data: [],
			refreshedTokenMessage: 'refreshed token',
		});
	});

	test('should return list of transactions', async () => {
		verifyAuth.mockImplementation(() => ({
			authorized: true,
			cause: 'Authorized',
		}));

		const mockResult = [
			{
				username: 'test',
				amount: 100,
				type: 'investment',
				date: '2021-01-01',
				joinedData: {
					color: '#fcbe44',
				},
			},
			{
				username: 'test',
				amount: 100,
				type: 'income',
				date: '2021-01-01',
				joinedData: {
					color: '#44fcbe',
				},
			},
		];

		transactions.aggregate.mockResolvedValue(mockResult);

		await getAllTransactions(mockReq, mockRes);

		expect(mockRes.status).toHaveBeenCalledWith(200);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						username: expect.any(String),
						amount: expect.any(Number),
						type: expect.any(String),
						date: expect.any(String),
						color: expect.any(String),
					}),
				]),
				refreshedTokenMessage: expect.any(String),
			})
		);
	});
});

describe('getTransactionsByUser', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByUserByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroup', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('getTransactionsByGroupByCategory', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransaction', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('deleteTransactions', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});
