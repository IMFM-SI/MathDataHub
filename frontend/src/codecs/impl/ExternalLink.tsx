import React from "react"
import type { TValidationResult, TPresenterProps } from "../codec"
import Codec from "../codec"

type ExternalLinkValue = {
    source_identifier: string
    source_name: string
    source_description: string
    link_data: any
    link: string
}

export default class ExternalLink extends Codec<ExternalLinkValue, null> {
    readonly slug: string = "ExternalLink"
    readonly ordered: boolean | "+" | "-" = false

    readonly cellComponent = ExternalLinkCell

    readonly _filterViewerComponent = null
    readonly _filterEditorComponent = null

    parseFilterValue(_value: string | null): null {
        return null
    }

    cleanFilterValue(_value: null, _lastValue?: string): TValidationResult {
        return { valid: false }
    }

    toClipboardValue(value: ExternalLinkValue): string | null {
        return value.link
    }
}

class ExternalLinkCell extends React.Component<TPresenterProps<ExternalLink, ExternalLinkValue, null>> {
    render() {
        const { value } = this.props
        if (value === null) return null

        return <a href={value.link} target="_blank" rel="noreferrer">{value.source_name}</a>
    }
}
