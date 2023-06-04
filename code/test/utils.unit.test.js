import {
	handleDateFilterParams,
	verifyAuth,
	handleAmountFilterParams,
} from '../controllers/utils';

describe('handleDateFilterParams', () => {
	test('should return the correct date filter object', () => {
	  const mockReq = {
		query: {
		  from: '2023-01-01',
		  upTo: '2023-12-31',
		},
	  };
  
	  const result = handleDateFilterParams(mockReq);
  
	  expect(result).toEqual({
		date: {
		  $gte: new Date('2023-01-01T00:00:00.000Z'),
		  $lte: new Date('2023-12-31T23:59:59.999Z'),
		},
	  });
	});
  
	test('should return an empty object if no date filter is provided', () => {
	  const mockReq = {
		query: {},
	  };
  
	  const result = handleDateFilterParams(mockReq);
  
	  expect(result).toEqual({});
	});
  
	test('should throw an error if `date` is present with `from`', () => {
	  const mockReq = {
		query: {
		  date: '2023-05-10',
		  from: '2023-05-01',
		},
	  };
  
	  expect(() => handleDateFilterParams(mockReq)).toThrowError(
		'Cannot use `date` parameter together with `from` or `upTo`'
	  );
	});
  
	test('should throw an error if `date` is present with `upTo`', () => {
	  const mockReq = {
		query: {
		  date: '2023-05-10',
		  upTo: '2023-05-31',
		},
	  };
  
	  expect(() => handleDateFilterParams(mockReq)).toThrowError(
		'Cannot use `date` parameter together with `from` or `upTo`'
	  );
	});
  
	test('should throw an error if the value of any query parameter is not a valid date', () => {
	  const mockReq = {
		query: {
		  date: 'invalid-date',
		},
	  };
  
	  expect(() => handleDateFilterParams(mockReq)).toThrowError(
		'Invalid `date` parameter'
	  );
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
	it('returns correct amount object when min query parameter is provided', () => {
	  const req = {
		query: {
		  min: '10',
		},
	  };
  
	  const result = handleAmountFilterParams(req);
  
	  expect(result).toEqual({ amount: { $gte: 10 } });
	});
  
	it('returns correct amount object when max query parameter is provided', () => {
	  const req = {
		query: {
		  max: '50',
		},
	  };
  
	  const result = handleAmountFilterParams(req);
  
	  expect(result).toEqual({ amount: { $lte: 50 } });
	});
  
	it('returns correct amount object when both min and max query parameters are provided', () => {
	  const req = {
		query: {
		  min: '10',
		  max: '50',
		},
	  };
  
	  const result = handleAmountFilterParams(req);
  
	  expect(result).toEqual({ amount: { $gte: 10, $lte: 50 } });
	});
  
	it('returns an empty object when neither min nor max query parameters are provided', () => {
	  const req = {
		query: {},
	  };
  
	  const result = handleAmountFilterParams(req);
  
	  expect(result).toEqual({});
	});
  
	it('throws an error when the value of min query parameter is not a numerical value', () => {
	  const req = {
		query: {
		  min: 'abc',
		},
	  };
  
	  expect(() => {
		handleAmountFilterParams(req);
	  }).toThrowError('Invalid `min` parameter');
	});
  
	it('throws an error when the value of max query parameter is not a numerical value', () => {
	  const req = {
		query: {
		  max: 'def',
		},
	  };
  
	  expect(() => {
		handleAmountFilterParams(req);
	  }).toThrowError('Invalid `max` parameter');
	});
  });
