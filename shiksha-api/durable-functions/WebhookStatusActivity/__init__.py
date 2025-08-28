from core.models.status_webhook import GenStatus, WebhookPoster


async def main(req: dict) -> str:
    poster = WebhookPoster()
    await poster.post_status(GenStatus(**req))
    return f"Success"
