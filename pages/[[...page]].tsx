import { BuilderComponent, builder, useIsPreviewing } from '@builder.io/react';
import DefaultErrorPage from 'next/error';
import Head from 'next/head';
import '../styles/globals.css';

// Replace with your Public API Key
const BUILDER_API_KEY = process.env.NEXT_PUBLIC_BUILDER_API_KEY || 'b2436361d20a48f2985dda1b54b0b953';
builder.init(BUILDER_API_KEY);

export async function getStaticProps({ params }: any) {
  // Fetch the builder content for the given page
  const page = await builder
    .get('page', {
      userAttributes: {
        urlPath: '/' + (params?.page?.join('/') || ''),
      },
    })
    .toPromise();

  return {
    props: {
      page: page || null,
    },
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 5 seconds
    revalidate: 5,
  };
}

export async function getStaticPaths() {
  // Get a list of all pages in builder
  const pages = await builder.getAll('page', {
    options: { noTargeting: true },
    omit: 'data.blocks',
  });

  return {
    paths: pages.map((page) => String(page.data?.url)),
    fallback: true,
  };
}

export default function Page({ page }: { page: any }) {
  const isPreviewing = useIsPreviewing();

  if (!page && !isPreviewing) {
    return <DefaultErrorPage statusCode={404} />;
  }

  return (
    <>
      <Head>
        <title>{page?.data?.title || 'Valiant Garage Door'}</title>
        <meta name="description" content={page?.data?.description || 'Garage door repair and service'} />
      </Head>
      {/* 
        Render the Builder page 
        This is what enables visual editing in the Builder interface
      */}
      <BuilderComponent model="page" content={page || undefined} />
    </>
  );
}
