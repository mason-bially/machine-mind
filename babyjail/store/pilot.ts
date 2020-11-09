/* eslint-disable @typescript-eslint/explicit-function-return-type */
import _ from "lodash";
import { Pilot } from "@src/class";
import { AbsStoreModule, load_setter_handler } from "./store_module";
import { IPilotData } from "@src/interface";

export const FILEKEY_PILOTS = "pilots_v2.json";
export const FILEKEY_PILOT_GROUPS = "pilot_groups.json";

export class PilotManagementStore extends AbsStoreModule {
    private pilots: Pilot[] = [];
    private active_pilot: Pilot | null = null;
    private pilot_groups: string[] = [];
    private loaded_mech_id = "";

    // Return the list of pilots
    public get Pilots(): Pilot[] {
        return this.pilots;
    }

    // Returns the acttive pilot
    public get ActivePilot(): Pilot | null {
        return this.active_pilot;
    }

    // Return the list of pilot groups
    public get PilotGroups(): string[] {
        return this.pilot_groups;
    }

    // Return the active mech
    public get LoadedMechId(): string {
        return this.loaded_mech_id;
    }

    // Retrieve a pilot, by ID
    public getPilot(id: string): Pilot | null {
        return this.pilots.find(x => x.ID === id) || null;
    }

    // Replace a pilot (by ID) with a new one. Useful for "committing" a locally edited copy.
    // Same as delete
    public updatePilot(pilot: Pilot): void {
        const pilotIndex = this.Pilots.findIndex(x => x.ID === pilot.ID);
        if (pilotIndex > -1) {
            this.Pilots.splice(pilotIndex, 1, pilot);
            this.saveData();
        } else {
            throw console.error(
                `Attempted to update pilot ${pilot.ID} but they did were not found in the store.`
            );
        }
    }

    // Replace the current loaded pilot list with an entirely new one.
    public setPilots(payload: Pilot[]): void {
        this.pilots = payload;
        this.saveData();
    }

    // Duplicate a loaded pilot
    public clonePilot(pilot: Pilot): void {
        // To and from serialize, to be absolutely certain we aren't leaving any dangling data
        const pilotData = Pilot.Serialize(pilot);
        const newPilot = Pilot.Deserialize(pilotData);
        newPilot.RenewID();
        newPilot.Name += " (CLONE)";
        newPilot.Callsign += "*";
        for (const mech of newPilot.Mechs) {
            mech.RenewID();
        }
        this.pilots.push(newPilot);
        this.saveData();
    }

    // Add a new pilot to the loaded data
    public addPilot(payload: Pilot): void {
        this.pilots.push(payload);
        this.saveData();
    }

    // Add a group with the provided name
    public addGroup(name: string): void {
        this.pilot_groups.push(name);
        this.saveData();
    }

    // Delete a loaded pilot
    public deletePilot(pilot: Pilot): void {
        const pilotIndex = this.Pilots.findIndex(x => x.ID === pilot.ID);
        if (pilotIndex > -1) {
            this.Pilots.splice(pilotIndex, 1);
            this.saveData();
        } else {
            throw console.error("Pilot not loaded!");
        }
    }

    // Delete the group with the provided name
    public deleteGroup(name: string): void {
        this.pilot_groups.splice(this.PilotGroups.indexOf(name), 1);
        this.saveData();
    }

    // Set the loaded mech to the provided id
    public setLoadedMech(id: string): void {
        this.loaded_mech_id = id;
    }

    // Save/load from persistent
    public async saveData() {
        const pilot_data = this.pilots.map(p => Pilot.Serialize(p));
        const pilot_groups = this.PilotGroups;
        await this.persistence.set_item(FILEKEY_PILOTS, pilot_data);
        await this.persistence.set_item(FILEKEY_PILOT_GROUPS, pilot_groups);
    }

    public async loadData(handler: load_setter_handler<PilotManagementStore>): Promise<void> {
        let raw_pilots = (await this.persistence.get_item<IPilotData[]>(FILEKEY_PILOTS)) || [];
        let raw_groups = (await this.persistence.get_item<string[]>(FILEKEY_PILOT_GROUPS)) || [];

        let parsed_pilots = raw_pilots.map((p: IPilotData) => Pilot.Deserialize(p));

        // Set when able
        handler(x => {
            x.pilots = parsed_pilots;
            x.pilot_groups = raw_groups;
        });
    }
}
