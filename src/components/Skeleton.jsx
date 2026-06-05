import React from 'react';

export function VerseSkeleton() {
  return (
    <div className="skel-verse">
      <div className="skel-line skel-w60" />
      <div className="skel-line skel-w90" />
      <div className="skel-line skel-w75" />
      <div className="skel-line skel-w40" />
    </div>
  );
}

export function ChapterSkeleton() {
  return (
    <div className="skel-chapter">
      <div className="skel-hdr">
        <div className="skel-block skel-w40" />
        <div className="skel-block skel-w20" />
      </div>
      <div className="skel-divider" />
      {Array.from({ length: 6 }, (_, i) => (
        <VerseSkeleton key={i} />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="skel-card-list">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skel-card">
          <div className="skel-block skel-w60" />
          <div className="skel-block skel-w90" style={{ height: 12 }} />
          <div className="skel-block skel-w30" style={{ height: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="skel-page">
      <div className="skel-hdr">
        <div className="skel-block skel-w30" />
      </div>
      <CardSkeleton count={2} />
    </div>
  );
}
