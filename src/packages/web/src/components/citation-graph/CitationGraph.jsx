import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import styles from './CitationGraph.module.css';
import { GraphHelp } from './GraphHelp.jsx';

echarts.use([GraphChart, LegendComponent, TooltipComponent, CanvasRenderer]);

const CLASSIFICATION_COLOR = {
  'self-direct': '#c62828',
  'self-coauthor': '#ef6c00',
  'external': '#9e9e9e',
};

const AUTHOR_COLOR = '#212121';
const PAPER_COLOR = '#0172ad';

const LEGEND_LABELS = {
  author: 'Selected author',
  paper: 'Author’s paper',
  'self-direct': 'Citing paper: direct',
  'self-coauthor': 'Citing paper: co-author',
  external: 'Citing paper: external',
};

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
      const citingId = `citing:${citation.publication.pubId}:${citation.classification}`;

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

const buildOption = (author, publications, textColor) => {
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
      data: [
        {
          name: 'author',
          icon: 'diamond',
        },
        {
          name: 'paper',
          icon: 'triangle',
        },
        ...Object.keys(CLASSIFICATION_COLOR).map((classification) => {
          return {
            name: classification,
            icon: 'circle',
          };
        }),
      ],
      formatter: (name) =>
        LEGEND_LABELS[name],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 12,
        color: textColor,
      },
    },
    series: [
      {
        type: 'graph',
        bottom: 80,
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
  const helpButtonRef = useRef(null);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    const chart = echarts.init(containerRef.current);

    const textColor = getComputedStyle(containerRef.current).color;
    chart.setOption(buildOption(author, publications, textColor));

    const observer = new ResizeObserver(() => {
      if (containerRef.current.clientWidth > 0) {
        chart.resize();
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [author, publications]);

  return (
    <div className={styles.Graph} style={{
      '--author-color': AUTHOR_COLOR,
      '--paper-color': PAPER_COLOR,
      '--direct-color': CLASSIFICATION_COLOR['self-direct'],
      '--coauthor-color': CLASSIFICATION_COLOR['self-coauthor'],
      '--external-color': CLASSIFICATION_COLOR.external,
    }}>
      <div ref={containerRef} className={styles.Canvas} />
      <button
        ref={helpButtonRef}
        type="button"
        className={styles.HelpButton}
        title="How to read the graph"
        onClick={() =>
          setShowHelp(!showHelp)}>?</button>
      {showHelp && <GraphHelp onClose={() => {
        setShowHelp(false);
        helpButtonRef.current.focus();
      }} />}
    </div>
  );
};
