from typing import Optional, List, Any, Type

from django.db import models

from ..codec import Codec, CodecManager


class ExternalSource(models.Model):
    """A specific external source whose items can be linked to."""

    slug = models.SlugField(unique=True)
    name = models.TextField()
    description = models.TextField()

    def get_url(self, link_data) -> str:
        match self.slug:
            case "hog":
                return f"https://houseofgraphs.org/graphs/{link_data['id']}"
        raise RuntimeError(f"constructing url for unknown external source '{self.slug}'")


class ExternalLinkManager(CodecManager):

    def get_queryset(self):
        return super().get_queryset().select_related("source")


class ExternalLink(Codec):
    """Link to an external resource."""

    source = models.ForeignKey(ExternalSource, on_delete=models.PROTECT)
    link_data = models.JSONField()

    _base_manager = ExternalLinkManager
    objects = ExternalLinkManager()

    value_fields = ["source", "link_data"]

    operators = ("=", "!=")

    @classmethod
    def serialize_values(cls: Type[Codec], source_id, link_data, *, database: bool = True) -> Optional[List[Any]]:
        if source_id is None:
            return None
        source = ExternalSource.objects.get(pk=source_id)
        return [{
            "source_identifier": source.slug,
            "source_name": source.name,
            "source_description": source.description,
            "link_data": link_data,
            "link": source.get_url(link_data),
        }]

    @classmethod
    def populate_values(cls: Type[Codec], *values: List[Optional[Any]]) -> List[Any]:
        val = values[0]
        source, _ = ExternalSource.objects.get_or_create(slug=val["source_identifier"], defaults={
            "name": val["source_name"],
            "description": val["source_description"],
        })
        return [source.pk, val["link_data"]]
