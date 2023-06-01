import {
	handleDateFilterParams,
	verifyAuth,
	handleAmountFilterParams,
} from '../controllers/utils';

describe('handleDateFilterParams', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});

describe('verifyAuth', () => {
	test('should return 401 if there are no cookies', () => {
		const mockReq = {
			cookies: {},
			body: {},
			params: {}
		};
		const mockRes = {};

		const response = verifyAuth(mockReq, mockRes);

		expect(response).toHaveProperty('authorized', false);
		expect(response).toHaveProperty('cause');
	});

	test
});

describe('handleAmountFilterParams', () => {
	test('Dummy test, change it', () => {
		expect(true).toBe(true);
	});
});
