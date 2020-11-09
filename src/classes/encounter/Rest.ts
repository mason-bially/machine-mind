/*
import { nanoid } from "nanoid";
import { MissionStepType } from "@/class";
import { IMissionStep } from "@/interface";

export interface IRestData {
    id: string;
    note: string;
}

export class Rest implements IMissionStep {
    private _id: string;
    private _note: string;

    public constructor() {
        this._id = nanoid();
        this._note = "";
    }

    public get ID(): string {
        return this._id;
    }

    public get StepType(): MissionStepType {
        return MissionStepType.Rest;
    }

    public get Note(): string {
        return this._note;
    }

    public set Note(val: string) {
        this._note = val;
    }

    public static Serialize(rest: Rest): IRestData {
        return {
            id: rest.ID,
            note: rest.Note,
        };
    }

    public static Deserialize(data: IRestData): Rest {
        const r = new Rest();
        r._id = data.id;
        r._note = data.note;
        return r;
    }
}

*/
