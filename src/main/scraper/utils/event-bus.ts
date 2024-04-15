import EventEmitter from 'node:events';

const eventBus = new EventEmitter();

eventBus.on('error', (err) => {
  console.error('Error occurred', err);
});

export { eventBus };
