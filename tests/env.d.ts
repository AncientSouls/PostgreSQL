import { Triggers } from '../lib/triggers';
export declare const newEnv: () => {
    client: any;
    triggers: Triggers;
    delay: (time: any) => Promise<{}>;
    tableReinit: () => Promise<void>;
    triggersReinit: (ram?: boolean) => Promise<void>;
    dockerStop: () => Promise<void>;
    dockerStart: () => Promise<void>;
    createClient: () => Promise<void>;
};
