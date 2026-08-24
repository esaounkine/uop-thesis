import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import styles from './CitationGraph.module.css';

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const CLASSIFICATION_COLOR = {
  'self-direct': '#c62828',
  'self-coauthor': '#ef6c00',
  'external': '#9e9e9e',
};

const AUTHOR_COLOR = '#212121';
const PAPER_COLOR = '#0172ad';

const toAuthorNames = (publication) => {
  return (publication.contributions ?? [])
    .map((contribution) =>
      contribution.authorName)
    .filter(Boolean)
    .join(', ');
};

const toInfo = (publication, extra = {}) => {
  return {
    title: publication.title,
    year: publication.year,
    authors: toAuthorNames(publication),
    citationCount: publication.citationCount,
    id: publication.pubId,
    ...extra,
  };
};

const escapeHtml = (text) => {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
};

const toTooltipHtml = (info) => {
  return [
    `<strong>${escapeHtml(info.title ?? info.id)}</strong>`,
    info.organisation && escapeHtml(info.organisation),
    info.authors && escapeHtml(info.authors),
    info.year != null && `Year: ${info.year}`,
    info.citationCount != null && `Citations: ${info.citationCount}`,
    info.classification && `Classification: ${info.classification}`,
    `<span style="color: grey">${escapeHtml(info.id)}</span>`,
  ]
    .filter(Boolean)
    .join('<br/>');
};

const buildData = (author, publications) => {
  const authorNodeId = 'author';
  const nodes = new Map();
  const links = [];

  nodes.set(authorNodeId, {
    id: authorNodeId,
    category: 'author',
    symbol: 'diamond',
    symbolSize: 24,
    label: {
      show: true,
      fontSize: 10,
    },
    info: {
      title: author.originalName,
      organisation: author.organisation,
      id: author.authorId,
    },
  });

  publications.forEach((entry) => {
    const paperId = `paper:${entry.publication.pubId}`;

    nodes.set(paperId, {
      id: paperId,
      category: 'paper',
      symbol: 'triangle',
      symbolSize: 14,
      info: toInfo(entry.publication),
    });
    links.push({
      source: authorNodeId,
      target: paperId,
    });

    entry.citations.forEach((citation) => {
      const citingId = `citing:${citation.publication.pubId}`;

      if (!nodes.has(citingId)) {
        nodes.set(citingId, {
          id: citingId,
          category: citation.classification,
          symbolSize: 8,
          info: toInfo(citation.publication, {
            classification: citation.classification,
          }),
        });
      }
      links.push({
        source: citingId,
        target: paperId,
      });
    });
  });

  return {
    nodes: [...nodes.values()],
    links: links,
  };
};

const buildOption = (author, publications) => {
  const { nodes, links } = buildData(author, publications);

  return {
    color: [AUTHOR_COLOR, PAPER_COLOR, ...Object.values(CLASSIFICATION_COLOR)],
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params) => {
        return params.dataType === 'node'
          ? toTooltipHtml(params.data.info)
          : '';
      },
    },
    legend: {
      data: Object.keys(CLASSIFICATION_COLOR),
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10 },
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        circular: { rotateLabel: false },
        roam: true,
        data: nodes,
        links: links,
        categories: [
          { name: 'author' },
          { name: 'paper' },
          ...Object.keys(CLASSIFICATION_COLOR).map((classification) => {
            return { name: classification };
          }),
        ],
        label: { show: false },
        lineStyle: {
          color: 'source',
          width: 1,
          curveness: 0.1,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 2 },
        },
      },
    ],
  };
};

export const CitationGraph = ({ author, publications }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(containerRef.current);

    chart.setOption(buildOption(author, publications));

    return () =>
      chart.dispose();
  }, [author, publications]);

  return (
    <div>
      <div className={styles.Graph}>
        <div ref={containerRef} className={styles.Canvas} />
      </div>
      <div className={styles.Legend}>
        <span className={styles.LegendItem}>
          <span className={`${styles.Shape} ${styles.Diamond}`} />
          author
        </span>
        <span className={styles.LegendItem}>
          <span className={`${styles.Shape} ${styles.Triangle}`} />
          paper
        </span>
        <span className={styles.LegendItem}>
          <span className={`${styles.Shape} ${styles.Circle}`} />
          citing paper
        </span>
      </div>
    </div>
  );
};
