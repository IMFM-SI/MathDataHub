import type { GetServerSideProps } from "next"
import React from "react"
import LaTeX from "react-latex"
import { Col, Container, Row } from "reactstrap"
import { MDHBackendClient, ResponseError } from "../../../client"
import type { TMDHCollection } from "../../../client/rest"
import MDHMain from "../../../components/common/MDHMain"

type AboutPageProps = {
    collection: TMDHCollection,
}

export default function ProvenancePAGE({ collection: { displayName, description, metadata } }: AboutPageProps) {
    return <MDHMain title={<LaTeX>{displayName}</LaTeX>} textTitle={displayName}>
        <Container>
            <Row>
                <Col sm="12">
                    <p><LaTeX>{description || "No description provided"}</LaTeX></p>
                    <p>
                        {(metadata.schemaTheoryURL && metadata.schemaTheoryURL.length > 0) &&
                            <a href={metadata.schemaTheoryURL}>Schema theory</a>
                        }
                    </p>
                    <p>Authors: {metadata.authors ?? "N/A"}</p>
                    <p>Size: {metadata.size ?? "N/A"}</p>
                    <ul>
                        {(metadata.references && metadata.references.length > 0) &&
                            metadata.references.map((r: any) =>
                                <li key={r.url}><a href={r.url}>{r.title}</a></li>
                            )
                        }
                    </ul>
                </Col>
            </Row>
        </Container>
    </MDHMain>
}

export const getServerSideProps: GetServerSideProps = async function ({ params: { slug } }) {
    let collection: TMDHCollection
    try {
        collection = await MDHBackendClient.getInstance().fetchCollection(slug as string)
    } catch(e) {
        if (!(e instanceof ResponseError) || !e.isNotFound) throw e
        return { notFound: true }
    }

    return {
        props: { collection }, // will be passed to the page component as props
    }
}