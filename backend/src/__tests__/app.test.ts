import request from 'supertest';
import app from '../app.js';

describe('Express App', () => {
  it('should have CORS enabled', async () => {
    const response = await request(app).options('/api/students');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should parse JSON bodies', async () => {
    const response = await request(app)
      .post('/api/students')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');

    // Should parse the JSON (even if endpoint validation fails)
    expect(response.status).not.toBe(415); // Not "Unsupported Media Type"
  });

  it('should have /api/students route mounted', async () => {
    const response = await request(app).get('/api/students/test-user');
    // Route exists (though may return 403 without auth)
    expect(response.status).not.toBe(404);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown-route');
    expect(response.status).toBe(404);
  });

  it('should return hello world from /hello endpoint', async () => {
    const response = await request(app).get('/hello');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'hello world' });
  });
});
