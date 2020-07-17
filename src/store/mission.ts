/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Mission, ActiveMission } from "@/class";
import { PersistentStore } from "@/io/persistence";
import { IMissionData } from "@/classes/encounter/Mission";
import { IActiveMissionData } from "@/classes/encounter/ActiveMission";
import { AbsStoreModule, load_setter_handler } from "./store_module";

export const FILEKEY_MISSIONS = "missions_v2.json";
export const FILEKEY_ACTIVE_MISSIONS = "active_missions_v2.json";

export class MissionStore extends AbsStoreModule {
    // The mission state
    private _missions: Mission[] = [];
    private _active_missions: ActiveMission[] = [];

    // Accessors to current state
    public get Missions(): Mission[] {
        return this._missions;
    }
    public get ActiveMissions(): ActiveMission[] {
        return this._active_missions;
    }

    // Duplicate the given mission in the store.
    public cloneMission(payload: Mission): void {
        let ser = Mission.Serialize(payload);
        ser.name = payload.Name = " (COPY)";
        let renewed = Mission.Deserialize(ser);
        renewed.RenewID();
        this.addMission(renewed);
    }

    // Add a mission to the store
    public addMission(payload: Mission): void {
        this._missions.push(payload);
        this.saveData();
    }

    // Add an active mission to the store
    public addActiveMission(payload: ActiveMission): void {
        this._active_missions.push(payload);
        this.saveData();
    }

    // Delete the specified mission from the store
    public deleteMission(payload: Mission): void {
        let idx = this._missions.findIndex(v => v.ID === payload.ID);
        if (idx > -1) {
            this._missions.splice(idx);
            this.saveData();
        }
    }

    // Delete the specified active mission from the store
    public deleteActiveMission(payload: ActiveMission): void {
        let idx = this._active_missions.findIndex(v => v.ID === payload.ID);
        if (idx > -1) {
            this._active_missions.splice(idx);
            this.saveData();
        }
    }

    // Commit data to static storage, overwriting previous data. Does not occur immediately, typically
    public async saveData(): Promise<void> {
        let raw_missions = this._missions.map(v => Mission.Serialize(v));
        let raw_actives = this._active_missions.map(v => ActiveMission.Serialize(v));
        await this.persistence.set_item(FILEKEY_MISSIONS, raw_missions);
        await this.persistence.set_item(FILEKEY_ACTIVE_MISSIONS, raw_actives);
    }

    // Load missions from persistent storage
    public async loadData(handler: load_setter_handler<MissionStore>): Promise<void> {
        let raw_missions =
            (await this.persistence.get_item<IMissionData[]>(FILEKEY_MISSIONS)) || [];
        let raw_actives =
            (await this.persistence.get_item<IActiveMissionData[]>(FILEKEY_ACTIVE_MISSIONS)) || [];

        let _missions = raw_missions.map(v => Mission.Deserialize(v));
        let _active_missions = raw_actives.map(v => ActiveMission.Deserialize(v));
        handler(x => {
            x._active_missions = _active_missions;
            x._missions = _missions;
        });
    }
}
