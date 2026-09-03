
const { baseSchema, ensureCollection } = require('./common');

const { VIDEO_STATUS, VIDEO_VISIBILITIES } = require('../constant');

const name = 'videos';

const updateSchema = async (db) => {
  const validator = {
    $jsonSchema: {
     bsonType: 'object',
     additionalProperties: false,
     required: [
       'title',
       'fileName',
       'originalName',
       'visibility',
       'status',
       'recordingDate',
       'videoLink',
       ...Object.keys(baseSchema),
     ],
     properties: {
       ...baseSchema,
       title: { bsonType: 'string', description: 'must be a string and is required' },
       description: { bsonType: 'string', description: 'must be a string and is required' },
       viewCount: { bsonType: 'int', minimum: 0, description: 'must be an integer' },
       visibility: {
         enum: Object.values(VIDEO_VISIBILITIES),
         description: 'one of the allowed visibility values',
       },
       duration: { bsonType: 'int', minimum: 0, description: 'must be an integer' },
       status: {
         enum: Object.values(VIDEO_STATUS),
         description: 'one of the allowed status values',
       },
       playlistId: { bsonType: 'objectId', description: 'must be an objectId' },
       language: { bsonType: 'string', description: 'must be a string' },
       recordingDate: { bsonType: 'date', description: 'must be a date' },
       category: { bsonType: 'string', description: 'must be a string' },
       likesCount: { bsonType: 'int', minimum: 0, description: 'must be an integer' },
       dislikesCount: { bsonType: 'int', minimum: 0, description: 'must be an integer' },
       videoLink: { bsonType: 'string', description: 'must be a string and is required' },
       fileName: { bsonType: 'string', description: 'must be a string and is required' },
       originalName: { bsonType: 'string', description: 'must be a string and is required' },
       thumbnailUrl: { bsonType: 'string', description: 'must be a string' },
       thumbnailPath: { bsonType: 'string', description: 'must be a string' },
       processedPath: { bsonType: 'string', description: 'must be a string' },
       hlsPath: { bsonType: 'string', description: 'must be a string' },
       tags: { bsonType: 'array', description: 'must be an array' },
       publishedAt: { bsonType: 'date', description: 'must be a date' },
       history: { bsonType: 'array', description: 'must be an array' },
     },
    },
  };

  const indexes = [
    { key: { title: -1 }, name: 'custom_title_index' },
    { key: { title: 'text' }, name: 'title_text_index' },
    { key: { visibility: -1 }, name: 'custom_visibility_index' },
    { key: { playlistId: -1 }, name: 'custom_playlistId_index' },
    { key: { recordingDate: -1 }, name: 'custom_recordingDate_index' },
    { key: { viewCount: -1 }, name: 'custom_viewCount_index' },
    { key: { status: -1 }, name: 'custom_status_index' },
  ];

  await ensureCollection({ db, name, validator, indexes });
};

module.exports = { updateSchema };


