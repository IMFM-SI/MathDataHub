import CodecManager from "../codecs"
import type Codec from "../codecs/codec"
import type { TableColumn } from "../components/query/results/table"
import ExporterManager from "../exporters/manager"
import type { MDHFilter, ParsedMDHCollection } from "./derived"
import type { TDRFPagedResponse, TMDHCollection, TMDHItem, TMDHPreFilter, TMDHProperty } from "./rest"

/** TCollectionPredicate is a predicate on a collection */
export type TCollectionPredicate = {
    /** the set of applied filters */
    filters: MDHFilter[];

    /** selected pre-filter */
    pre_filter?: TMDHPreFilter;
}

type CollectionLike = Pick<ParsedMDHCollection, "slug">

export class MDHBackendClient {
    /**
     * @param base_url the Base URL for all API requests
     * @param codec_manager interface to all known codecs
     */
    constructor(public base_url: string, public codec_manager: CodecManager, public exporter_manager: ExporterManager) { }

    private static instance: MDHBackendClient
    static getInstance(): MDHBackendClient {
        if (MDHBackendClient.instance) {
            return MDHBackendClient.instance
        }
        const base_url = (typeof window === "undefined") ? process.env.DJANGO_URL + "/api" : "/api"
        MDHBackendClient.instance = new MDHBackendClient(base_url, CodecManager.getInstance(), ExporterManager.getInstance())
        return MDHBackendClient.instance
    }

    /**
     * Fetches json data from the api given the url and provided parameters. 
     * Rejects when the request fails
     */
    async fetchJSON<T>(url: string, params: {[key: string]: string} = {}): Promise<T> {
        // build an array of "key=params"
        const paramAry = Object.keys(params).filter(k => params[k] !== "").map(key => {
            return key + "=" + encodeURIComponent(params[key])
        })

        // make it into a string
        const paramsString = (paramAry.length > 0) ? ("?" + paramAry.join("&")) : ""

        // use fetch()
        const res = await fetch(this.base_url + url + paramsString, {
            method: "GET",
            headers: { "Content-Type": "application/json; charset=utf-8" },
        })

        // reject if things failed
        if (!res.ok) throw new ResponseError(res)

        // and return the json
        return res.json()
    }

    /** Fetches information about a collection with the given name or rejects */
    async fetchCollection(name: string): Promise<TMDHCollection> {
        return this.fetchJSON<TMDHCollection>(`/schema/collections/${name}/`)
    }

    /** Fetches information about a collection and an item within the collection */
    async fetchCollectionAndItem(name: string, id: string): Promise<[TMDHCollection, TMDHItem<{}>]> {
        return Promise.all([
            this.fetchCollection(name),
            this.fetchJSON<TMDHItem<{}>>(`/item/${name}/${id}/`),
        ])
    }

    /** Fetches a list of all collections */
    async fetchCollections(page = 1, per_page = 20): Promise<TDRFPagedResponse<TMDHCollection>> {
        return this.fetchJSON("/schema/collections/", {
            page: page.toString(),
            per_page: per_page.toString(),
        })
    }

    /** parses a collection and prepares appropriate derived values */
    parseCollection(collection: TMDHCollection): ParsedMDHCollection {

        const propMap = new Map<string, TMDHProperty>()
        const nameMap = new Map<string, string>()
        const codecMap = new Map<string, Codec>()
        const columnMap = new Map<string, TableColumn<TMDHItem<any>>>()

        const propertySlugs = collection.properties.map(p => {
            const { slug, codec } = p

            propMap.set(slug, p)
            nameMap.set(slug, p.displayName)

            const c = this.codec_manager.getWithFallback(codec)
            codecMap.set(slug, c)
            
            columnMap.set(slug, c.makeReactTableColumn(p))

            return p.slug
        })

        const defaultPropertySlugs = propertySlugs.filter(s => propMap.get(s).default)

        const exporterInstances = collection.exporters.map(slug => this.exporter_manager.get(slug)).filter(x => x !== undefined)

        const defaultPreFilter = (collection.preFilters.length > 0) ? collection.preFilters[0] : undefined
        return { propMap, nameMap, propertySlugs, defaultPropertySlugs, exporterInstances, codecMap, columnMap, defaultPreFilter, ...collection }
    }

    /** Fetches information about a set of collection items */
    async fetchItems<T extends {}>(collection: ParsedMDHCollection, properties: string[], query: TCollectionPredicate, order: string, page_number = 1, per_page = 100): Promise<TDRFPagedResponse<TMDHItem<T>>> {
        // Build the filter params
        const params = {
            properties: properties.join(","),
            page: page_number.toString(),
            per_page: per_page.toString(),
            order: MDHBackendClient.buildSortOrder(collection, properties, order),
            ...MDHBackendClient.buildParameters(query),
        }

        // fetch the results
        return this.fetchJSON<TDRFPagedResponse<TMDHItem<T>>>(`/query/${collection.slug}/`, params)
    }

    /** hashes the parameters to the fetchItems function */
    static hashFetchItems({ slug }: CollectionLike, properties: string[], query: TCollectionPredicate, order: string, page_number = 1, per_page = 100): string {
        const hash = {
            collection: slug,
            pre_filter: query.pre_filter,
            filters: query.filters.filter(f => f.value !== null),
            properties: properties,
            order: order,
            page_number: page_number,
            per_page: per_page,
        }
        return JSON.stringify(hash)
    }

    /** Fetches the number of items in a collection */
    async fetchItemCount({ slug }: CollectionLike, query: TCollectionPredicate): Promise<number> {
        // build the parameters
        const params = MDHBackendClient.buildParameters(query)

        // fetch the results
        const res = await this.fetchJSON<TDRFPagedResponse<{count: number}>>(`/query/${slug}/count/`, params)
        return res.count
    }

    /** hashes the parameters to the fetchItemCount function */
    static hashFetchItemCount({ slug }: CollectionLike, query: TCollectionPredicate): string {
        const hash = {
            collection: slug,
            pre_filter: query.pre_filter,
            filters: query.filters.filter(f => f.value !== null),
        }
        return JSON.stringify(hash)
    }

    /** give a query build parameters to send to it */
    private static buildParameters(query: TCollectionPredicate): { filter: string } {
        const filterAry = query.filters.filter(f => f.value !== null).map(f => `(${f.slug}${f.value})`)
        const filter = (query.pre_filter ? [`(${query.pre_filter.condition})`, ...filterAry] : filterAry).join("&&")
        return { filter }
    }

    /** builds a sort order string to pass to the backend */
    private static buildSortOrder(collection: ParsedMDHCollection, properties: string[], order: string): string {
        const sorder = order.split(",") // array containing the final order
        
        // add properties which have not been ordered
        const unordered = new Set(collection.propertySlugs)
        sorder.forEach(n => unordered.delete(this.parseSortPart(n).id))
        unordered.forEach(e => sorder.push(e))
        
        // find all the properties that we want to filter by in the appropriate order
        return sorder
            .filter(n => properties.includes(MDHBackendClient.parseSortPart(n).id)) // filter by queries properties
            .filter(n => collection.propMap.has(MDHBackendClient.parseSortPart(n).id)) // filter by known properties
            .filter(n => collection.codecMap.get(MDHBackendClient.parseSortPart(n).id)!.ordered) // filter by orderable properties
            .map(n => {
                if(n.startsWith("+") || n.startsWith("-")) return n
                const order = collection.codecMap.get(n)!.ordered
                const sign = (order === true || order === "+") ? "+" : "-"
                return `${sign}${n}`
            })
            .join(",")
    }
    
    /**
     * Parses a part of a sort string into a modifier ("+", "-" or "") and an underlying property id
     * @param prop  Property inside the sort string to parse
     * @returns 
     */
    static parseSortPart(prop: string): {mod: string, id: string} {
        if (prop.startsWith("+")) return { mod: "+", id: prop.substring(1) }
        if (prop.startsWith("-")) return { mod: "-", id: prop.substring(1) }
        return { mod: "", id: prop }
    }
}

/** Indicates an error while fetching a request */
export class ResponseError implements Error {
    constructor(readonly response: Response) {}

    readonly name = "ResponseError"
    readonly message = `Request to ${this.response.url} failed. `

    /** indicates if the response returned the not found status */
    readonly isNotFound = this.response.status === 404
}