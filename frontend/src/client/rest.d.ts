/** @file contains types directly returned from the REST API */

/** a MathDataHub Collection */
export type TMDHCollection = {
    slug: string;
    hidden: boolean;
    displayName: string;
    flag_large_collection: boolean;
    exporters: string[];

    description: string;
    url: string | null;

    template: string | null;

    count: number | null;

    preFilters: TMDHPreFilter[]

    metadata?: any;
    
    properties: TMDHProperty[];
}

export type TMDHPreFilter = {
    description: string,
    condition: string,
    count: number | null,
}

/** a MathDataHub Property */
export type TMDHProperty = {
    slug: string;
    displayName: string;

    default: boolean;

    description: string;
    url: string | null;

    metadata?: any;

    codec: string;
}

/** an item in a collection */
export type TMDHItem<P extends {}> = P & {"_id": string}

/** a paged Django Rest Framework Response */
export type TDRFPagedResponse<T> = {
    /** the total number of results */
    count: number;
    
    /** url to the next page (if any) */
    next: string | null;
    /** url to the previous page (if any) */
    previous: string | null;

    /** the total number of pages */
    num_pages: number;

    /** the results themselves */
    results: T[];
}