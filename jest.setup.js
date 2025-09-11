import '@testing-library/jest-dom'

// Mock Next.js Request/Response objects
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
  text: jest.fn().mockResolvedValue(init?.body || ''),
}));

global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  status: init?.status || 200,
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest.fn().mockResolvedValue(body ? JSON.parse(body) : {}),
}));