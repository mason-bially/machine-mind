/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Encounter } from "@src/class";
import { IEncounterData } from "@src/classes/encounter/Encounter";
import { logger } from "@src/hooks";
import { AbsStoreModule, load_setter_handler } from "./store_module";

export const FILEKEY_ENCOUNTERS = "encounters_v2.json";

export class EncounterStore extends AbsStoreModule {
    private _encounters: Encounter[] = [];

    // Retrieve current encounters
    public get Encounters(): Encounter[] {
        return this._encounters;
    }

    // Retrieve by id
    public getEncounter(id: string): Encounter | null {
        return this._encounters.find(x => x.ID === id) || null;
    }

    // Replace by id
    public updateEncounter(new_enc: Encounter): void {
        let idx = this._encounters.findIndex(e => e.ID === new_enc.ID);
        if (idx > -1) {
            this._encounters.splice(idx, 1, new_enc);
            this.saveData();
        } else {
            logger(`Tried to update encounter ${new_enc.ID}, but it did not exist!`);
        }
    }

    // Duplicate a loaded encounter
    public cloneEncounter(payload: Encounter): void {
        let nv = Encounter.Deserialize(Encounter.Serialize(payload));
        nv.Name = nv.Name + " (COPY)";
        nv.RenewID();
        this.addEncounter(nv);
    }

    // Add a new encounter
    public addEncounter(payload: Encounter): void {
        this._encounters.push(payload);
        this.saveData();
    }

    // Delete an existing encounter
    public deleteEncounter(payload: Encounter): void {
        let idx = this._encounters.findIndex(e => e.ID === payload.ID);
        if (idx > -1) {
            this._encounters.splice(idx);
            this.saveData();
        } else {
            logger(`No such encounter ${payload.Name}`);
        }
    }

    // Save all loaded encounters to persisten memory, overwriting previous data
    public async saveData(): Promise<void> {
        let raw = this._encounters.map(e => Encounter.Serialize(e));
        await this.persistence.set_item(FILEKEY_ENCOUNTERS, raw);
    }

    // Load all encounters from persistent storage
    public async loadData(handler: load_setter_handler<EncounterStore>): Promise<void> {
        let raw = (await this.persistence.get_item<IEncounterData[]>(FILEKEY_ENCOUNTERS)) || [];
        let encounters = raw.map(d => Encounter.Deserialize(d));
        handler((x: EncounterStore) => {
            x._encounters = encounters;
        });
    }
}
