import { SteedosColumnType } from "./index";
import { ConnectionOptions, EntitySchema } from "typeorm";
import { SteedosDriverConfig } from "./driver";
import { SteedosTypeormDriver } from "../typeorm";
import { Dictionary } from "@salesforce/ts-types";
import { SteedosObjectType } from "../types";
import { SQLLang } from 'odata-v4-sql';
import { getEntities } from "../typeorm";

export class SteedosSqlServerDriver extends SteedosTypeormDriver {
    getSupportedColumnTypes() {
        return [
            SteedosColumnType.varchar,
            SteedosColumnType.text,
            SteedosColumnType.number,
            SteedosColumnType.boolean,
            SteedosColumnType.date,
            SteedosColumnType.dateTime,
            SteedosColumnType.oneToOne
        ]
    }

    sqlLang: SQLLang = SQLLang.MsSql;

    constructor(config: SteedosDriverConfig) {
        super(config);
    }

    getConnectionOptions(): ConnectionOptions {
        return  {
            type: "mssql",
            url: this._url,
            name: (new Date()).getTime().toString(),
            entities: Object.values(this._entities),
            username: this.config.username,
            password: this.config.password,
            database: this.config.database,
            options: this.config.options,
            logging: this.config.logging
        };
    }

    async createTables(objects: Dictionary<SteedosObjectType>) {
        this.registerEntities(objects);
        await this.connect();
        // await this._client.synchronize();
    }

    getEntities(objects: Dictionary<SteedosObjectType>): Dictionary<EntitySchema> {
        return getEntities(objects, "mssql");
    }
}