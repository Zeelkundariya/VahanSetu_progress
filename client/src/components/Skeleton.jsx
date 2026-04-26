import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width, height, borderRadius = '12px', className = '' }) => {
  return (
    <div 
      className={`vs-skeleton ${className}`} 
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius 
      }} 
    />
  );
};

export const ProfileSkeleton = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32 }}>
    <div className="vs-glass" style={{ padding: 40, borderRadius: 24 }}>
      <Skeleton height="110px" width="110px" borderRadius="50%" className="vs-skeleton-avatar" />
      <Skeleton height="30px" width="60%" style={{ marginTop: 24 }} />
      <Skeleton height="15px" width="40%" style={{ marginTop: 12 }} />
      <Skeleton height="50px" style={{ marginTop: 32 }} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Skeleton height="220px" borderRadius="20px" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Skeleton height="120px" borderRadius="20px" />
        <Skeleton height="120px" borderRadius="20px" />
      </div>
    </div>
  </div>
);

export const FleetSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
      {[...Array(5)].map((_, i) => <Skeleton key={i} height="140px" borderRadius="24px" />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
      <Skeleton height="500px" borderRadius="20px" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton height="200px" borderRadius="20px" />
        <Skeleton height="200px" borderRadius="20px" />
      </div>
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {[...Array(4)].map((_, i) => <Skeleton key={i} height="150px" borderRadius="20px" />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <Skeleton height="350px" borderRadius="20px" />
      <Skeleton height="350px" borderRadius="20px" />
    </div>
  </div>
);

export const CpoSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
      {[...Array(4)].map((_, i) => <Skeleton key={i} height="150px" borderRadius="20px" />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 36 }}>
      <Skeleton height="600px" borderRadius="24px" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Skeleton height="180px" borderRadius="24px" />
        <Skeleton height="320px" borderRadius="24px" />
        <Skeleton height="200px" borderRadius="24px" />
      </div>
    </div>
  </div>
);

export default Skeleton;
