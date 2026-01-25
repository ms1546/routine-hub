import React from 'react';

type StaticImport = {
  src: string;
  height?: number;
  width?: number;
  blurDataURL?: string;
};

type NextImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | StaticImport;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
};

export default function NextImageStub({
  src,
  alt,
  fill,
  width,
  height,
  style,
  ...rest
}: NextImageProps) {
  const resolvedSrc = typeof src === 'string' ? src : src.src;
  const resolvedStyle = { ...style };

  if (fill) {
    resolvedStyle.width = resolvedStyle.width ?? '100%';
    resolvedStyle.height = resolvedStyle.height ?? '100%';
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt ?? ''}
      width={width as number | undefined}
      height={height as number | undefined}
      style={resolvedStyle}
      {...rest}
    />
  );
}
