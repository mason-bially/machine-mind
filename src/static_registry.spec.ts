import "jest";
import {  } from "./static_registry";
import { RegCat, Registry, InventoriedRegEntry } from "./registry";


type DefSetup = Registry;

function init_basic_setup(): DefSetup {


}

describe("Counter", () => {
    it("starts at its default value", () => {
        const counter = new Counter(testCounterData);

        expect(counter.Value).toBe(testCounterData.default_value);
    });

    it("does not increment past its max value", () => {
        const counter = new Counter(testCounterData);

        for (let i = 0; i < 5; i++) {
            counter.Increment();
        }

        expect(counter.Value).toBe(6);

        counter.Increment();

        expect(counter.Value).toBe(6);
    });

    it("does not decrement past its min value", () => {
        const counter = new Counter(testCounterData);

        expect(counter.Value).toBe(1);

        counter.Decrement();

        expect(counter.Value).toBe(1);
    });

    it("resets properly", () => {
        const counter = new Counter(testCounterData);

        counter.Increment();
        counter.Increment();
        counter.Increment();

        counter.Reset();

        expect(counter.Value).toBe(testCounterData.default_value);
    });

    it("throws when given invalid data", () => {
        expect(() => {
            new Counter({
                id: "bad",
                name: "Bad counter",
                default_value: 0,
                min: 1,
            });
        }).toThrow();

        expect(() => {
            new Counter({
                id: "bad",
                name: "Bad counter",
                default_value: 2,
                max: 1,
            });
        }).toThrow();
    });

    it("works without min, max, or default values", () => {
        const testCounter = new Counter({
            id: "test",
            name: "Test counter",
        });

        expect(testCounter.Max).toBeUndefined();
        expect(testCounter.Min).toBeUndefined();

        expect(testCounter.Value).toBe(0);

        testCounter.Increment();
        expect(testCounter.Value).toBe(1);
        testCounter.Decrement();
        testCounter.Decrement();
        expect(testCounter.Value).toBe(-1);
    });

    it("does not change if set to a bad value", () => {
        const counter = new Counter(testCounterData);

        const oldVal = counter.Value;
        counter.Set("a" as any);
        expect(counter.Value).toBe(oldVal);
    });
});
