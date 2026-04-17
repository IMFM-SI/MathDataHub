import * as React from "react"
import { ReactTags } from "react-tag-autocomplete"
import type { TagSelected, TagSuggestion, TagRendererProps } from "react-tag-autocomplete"
import { Button } from "reactstrap"
import { MDHBackendClient } from "../../../client"
import type { ParsedMDHCollection } from "../../../client/derived"
import styles from "./sortable.module.css"

const CLASS_NAMES = {
    root: styles["react-tags"],
    rootIsActive: styles["is-focused"],
    rootIsDisabled: "",
    rootIsInvalid: "",
    label: styles["react-tags__label"],
    tagList: styles["react-tags__selected"],
    tagListItem: styles["react-tags__selected-tag"],
    tag: "",
    tagName: "",
    comboBox: styles["react-tags__search"],
    input: styles["react-tags__search-input"],
    listBox: styles["react-tags__suggestions"],
    option: styles["react-tags__suggestion"],
    optionIsActive: styles["is-active"],
    highlight: styles["react-tags__suggestion-prefix"],
}

function makeTagFromID(id: string, { propMap, codecMap }: ParsedMDHCollection): TagSelected | undefined {
    const { mod: tMod, id: tID } = MDHBackendClient.parseSortPart(id)

    const prop = propMap.get(tID)
    const codec = codecMap.get(tID)
    if (!prop || !codec.ordered) return undefined

    let label = prop.displayName
    if (tMod === "+") {
        label += " (Ascending)"
    }
    if (tMod === "-") {
        label += " (Descending)"
    }

    return { value: id, label }
}

type SortableProps = {
    id?: string;
    collection: ParsedMDHCollection,

    value: string,
    onChange: (order: string) => void,
}

type SortableState = {
    tags: TagSelected[]
    suggestions: TagSuggestion[]
}

export default class Sortable extends React.Component<SortableProps, SortableState> {

    state = {
        tags: [],
        suggestions: [],
    }

    static getDerivedStateFromProps({ collection, value: order }: SortableProps, state: SortableState): Partial<SortableState> {
        const tags = order.split(",")
            .map(id => makeTagFromID(id, collection))
            .filter((tag): tag is TagSelected => tag !== undefined)

        const suggestions = collection.properties.flatMap(({ slug }) => [
            makeTagFromID(slug, collection),
            makeTagFromID(`+${slug}`, collection),
            makeTagFromID(`-${slug}`, collection),
        ]).filter((tag): tag is TagSuggestion => tag !== undefined)

        return { tags, suggestions }
    }

    private static tagsToOrder(tags: TagSelected[]): string {
        return tags.map(t => String(t.value)).join(",")
    }

    private readonly onAdd = (tag: TagSelected) => {
        const tags = [...this.state.tags, tag]
        this.props.onChange(Sortable.tagsToOrder(tags))
    }

    private readonly onDelete = (index: number) => {
        const tags = this.state.tags.slice(0)
        tags.splice(index, 1)
        this.props.onChange(Sortable.tagsToOrder(tags))
    }

    private readonly suggestionsTransform = (value: string, suggestions: TagSuggestion[]): TagSuggestion[] => {
        const { mod: qMod, id: qID } = MDHBackendClient.parseSortPart(value)
        return suggestions.filter(tag => {
            const { mod: tMod, id: tID } = MDHBackendClient.parseSortPart(String(tag.value))
            return (
                tag.label.startsWith(qID) || tID.startsWith(qID)
            ) && (
                qMod === "" || tMod === qMod
            )
        })
    }

    render() {
        const { id } = this.props
        const { tags, suggestions } = this.state
        return <ReactTags
            classNames={CLASS_NAMES}
            id={id}

            selected={tags}
            suggestions={suggestions}
            suggestionsTransform={this.suggestionsTransform}
            placeholderText="Add another field"

            onAdd={this.onAdd}
            onDelete={this.onDelete}

            renderTag={TagComponent}
        />
    }
}

function TagComponent({ tag, classNames: _, ...buttonProps }: TagRendererProps) {
    return <Button outline size="sm" style={{ margin: 5 }} {...buttonProps}>
        {tag.label}
    </Button>
}
