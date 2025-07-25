import { prisma } from "@linkwarden/prisma";
import { rssHandler } from "@linkwarden/lib";
import setCollection from "@/lib/api/setCollection";
import verifyUser from "@/lib/api/verifyUser";
import { PostRssSubscriptionSchema } from "@linkwarden/lib/schemaValidation";
import { NextApiRequest, NextApiResponse } from "next";
import Parser from "rss-parser";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method === "GET") {
    const response = await prisma.rssSubscription.findMany({
      include: {
        collection: {
          select: {
            name: true,
          },
        },
      },
      where: {
        ownerId: user.id,
      },
    });

    return res.status(200).json({ response });
  }

  if (req.method === "POST") {
    if (process.env.NEXT_PUBLIC_DEMO === "true") {
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });
    }

    const dataValidation = PostRssSubscriptionSchema.safeParse(req.body);

    if (!dataValidation.success) {
      return res.status(400).json({
        response: `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`,
      });
    }

    const rssSubscriptionCount = await prisma.rssSubscription.count({
      where: {
        ownerId: user.id,
      },
    });

    const RSS_SUBSCRIPTION_LIMIT_PER_USER =
      Number(process.env.RSS_SUBSCRIPTION_LIMIT_PER_USER) || 20;

    if (rssSubscriptionCount >= RSS_SUBSCRIPTION_LIMIT_PER_USER) {
      return res.status(403).json({
        response: `You have reached the limit of ${RSS_SUBSCRIPTION_LIMIT_PER_USER} RSS subscriptions.`,
      });
    }

    const { name, url, collectionId, collectionName } = dataValidation.data;

    const linkCollection = await setCollection({
      userId: user.id,
      collectionId: collectionId,
      collectionName: collectionName,
    });

    if (!linkCollection) {
      return res.status(403).json({
        response: "You do not have permission to add a link to this collection",
      });
    }

    const existingRssSubscription = await prisma.rssSubscription.findFirst({
      where: {
        name: name,
        ownerId: user.id,
      },
    });

    if (existingRssSubscription) {
      return res
        .status(400)
        .json({ response: "RSS Subscription with that name already exists" });
    }

    const response = await prisma.rssSubscription.create({
      data: {
        name,
        url,
        ownerId: user.id,
        collection: {
          connect: {
            id: linkCollection.id,
          },
        },
      },
    });

    const parser = new Parser();

    await rssHandler(response, parser);

    return res.status(200).json({ response });
  }
}
