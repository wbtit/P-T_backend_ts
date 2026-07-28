import { isWithinWorkingHoursIST } from "../src/config/utils/timeCheck.util";

describe("Time Check Utility: isWithinWorkingHoursIST", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const setTimeIST = (hour: number, minute: number) => {
    // Determine the offset for IST which is +05:30 (330 minutes)
    // To set a specific IST time, we set the UTC time such that UTC + 5:30 = target IST time.
    // UTC hour = IST hour - 5 (adjusting for the 30 min)
    
    // Easier way: Create a Date string in IST and parse it
    // E.g., '2023-01-01T07:00:00+05:30'
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    const dateStr = `2023-01-01T${h}:${m}:00+05:30`;
    jest.setSystemTime(new Date(dateStr));
  };

  it("should allow time exactly at 7:00 AM", () => {
    setTimeIST(7, 0);
    expect(isWithinWorkingHoursIST()).toBe(true);
  });

  it("should allow time at 12:00 PM (Noon)", () => {
    setTimeIST(12, 0);
    expect(isWithinWorkingHoursIST()).toBe(true);
  });

  it("should allow time exactly at 11:55 PM", () => {
    setTimeIST(23, 55);
    expect(isWithinWorkingHoursIST()).toBe(true);
  });

  it("should deny time at 11:56 PM", () => {
    setTimeIST(23, 56);
    expect(isWithinWorkingHoursIST()).toBe(false);
  });

  it("should deny time at 12:00 AM (Midnight)", () => {
    setTimeIST(0, 0);
    expect(isWithinWorkingHoursIST()).toBe(false);
  });

  it("should deny time at 6:59 AM", () => {
    setTimeIST(6, 59);
    expect(isWithinWorkingHoursIST()).toBe(false);
  });
});
