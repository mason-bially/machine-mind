import { MechEquipment, SystemType, EntryType } from "@/class";
import { IMechEquipmentData, IEquipmentData } from "@/interface";
import { store } from "@/hooks";

export interface IMechSystemData extends IMechEquipmentData {
    type: SystemType;
}

export class MechSystem extends MechEquipment {
    private _system_type: SystemType;

    public constructor(systemData: IMechSystemData) {
        super(systemData);
        this._system_type = systemData.type;
        this._item_type = EntryType.MechSystem;
    }

    public get SP(): number {
        return this.sp;
    }

    public get Type(): SystemType {
        return this._system_type;
    }

    public static Serialize(item: MechSystem): IEquipmentData {
        return {
            id: item.ID,
            uses: item.Uses || 0,
            destroyed: item.Destroyed || false,
            cascading: item.IsCascading || false,
            note: item.Note,
            flavorName: item._flavor_name,
            flavorDescription: item._flavor_description,
        };
    }

    public static Deserialize(data: IEquipmentData): MechSystem {
        const item = store.compendium.instantiate("MechSystems", data.id) as MechSystem;
        item._uses = data.uses || 0;
        item._destroyed = data.destroyed || false;
        item._cascading = data.cascading || false;
        item._note = data.note;
        item._flavor_name = data.flavorName;
        item._flavor_description = data.flavorDescription;

        return item;
    }
}
