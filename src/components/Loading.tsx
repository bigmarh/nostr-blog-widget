import { Component } from 'solid-js';

export const Loading: Component = () => {
  return (
    <div class="nbw-flex nbw-items-center nbw-justify-center nbw-p-8">
      <div class="nbw-animate-spin nbw-rounded-full nbw-h-12 nbw-w-12 nbw-border-b-2 nbw-border-gray-900"></div>
    </div>
  );
};
