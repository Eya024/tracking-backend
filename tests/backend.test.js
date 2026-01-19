// tests/backend.test.js
const request = require("supertest");
const app = require("../index"); // your Express app

describe("POST /track", () => {
  it("should save a valid event and return 200", async () => {
    const event = {
      event_type: "pageview",
      page_url: "http://example.com",
      anonymous_id: "test-visitor",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app)
      .post("/track")
      .send(event)
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject invalid event data", async () => {
    const invalidEvent = {
      page_url: "http://example.com",
    };

    const res = await request(app)
      .post("/track")
      .send(invalidEvent)
      .set("Accept", "application/json");

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid event data");
  });

  it("should create a new session on session_start event", async () => {
    const event = {
      event_type: "session_start",
      page_url: "http://example.com",
      anonymous_id: "visitor-123",
      session_id: "session-123",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app).post("/track").send(event);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Optionally check the database directly to confirm session was inserted
  });


  it("should update session_end on session_end event", async () => {
    const startEvent = {
      event_type: "session_start",
      page_url: "http://example.com",
      anonymous_id: "visitor-456",
      session_id: "session-456",
      timestamp: new Date().toISOString(),
    };

    await request(app).post("/track").send(startEvent);

    const endEvent = {
      event_type: "session_end",
      page_url: "http://example.com",
      anonymous_id: "visitor-456",
      session_id: "session-456",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app).post("/track").send(endEvent);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Optionally check that session_end is updated in DB
  });

  it("should accept events without optional fields", async () => {
    const event = {
      event_type: "pageview",
      page_url: "http://example.com",
      anonymous_id: "visitor-789",
      timestamp: new Date().toISOString(),
    };

    const res = await request(app).post("/track").send(event);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });


  const { app, pool } = require("../index");

it("should return 500 on database error", async () => {
  jest.spyOn(pool, "query").mockImplementation(() => {
    throw new Error("DB error");
  });

  const event = {
    event_type: "pageview",
    page_url: "http://example.com",
    anonymous_id: "visitor-error",
    timestamp: new Date().toISOString(),
  };

  const res = await request(app).post("/track").send(event);

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toBe("Database error");

  pool.query.mockRestore();
});

it("should reject event missing anonymous_id", async () => {
  const event = {
    event_type: "pageview",
    page_url: "http://example.com",
    timestamp: new Date().toISOString(),
  };
  const res = await request(app).post("/track").send(event);
  expect(res.statusCode).toBe(400);
});



  
});
