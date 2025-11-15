import CollectionExporter from "."
import type { ParsedMDHCollection } from "../../client/derived"
import type { TMDHItem } from "../../client/rest"

export class JSONExporter<T> extends CollectionExporter<Array<TMDHItem<T>>> {
    readonly slug = "json"
    readonly displayName = "JSON"
    readonly defaultExtension = "json"
    
    async open(collection: ParsedMDHCollection): Promise<Array<TMDHItem<T>> | null> {
        return []
    }

    async add(acc: TMDHItem<T>[], items: TMDHItem<T>[], page_number: number): Promise<Array<TMDHItem<T>>> {
        return acc.concat(items)
    }

    async close(acc: TMDHItem<T>[], aborted: boolean): Promise<Blob | undefined> {
        let blob: Blob | undefined
        if (!aborted) {
            blob = new Blob(
                [JSON.stringify(acc)],
                { type: "application/json" },
            )
        }
        return blob
    }
}