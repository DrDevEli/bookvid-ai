/**
 * Video Renderer Service Tests
 */

const videoRenderer = require('../videoRenderer');
const progressTracking = require('../progressTracking');
const fileStorage = require('../../utils/fileStorage');

// Mock dependencies
jest.mock('../progressTracking');
jest.mock('../../utils/fileStorage');

const fs = require('fs');
jest.mock('fs', () => ({
	promises: {
		writeFile: jest.fn(),
		readFile: jest.fn(),
		stat: jest.fn(),
		readdir: jest.fn(),
		unlink: jest.fn()
	}
}));

describe('VideoRenderer Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock progress tracking
		progressTracking.initializeProgress.mockReturnValue({
			id: 'test-progress',
			status: 'starting',
			progress: 0
		});

		progressTracking.createStepUpdater.mockReturnValue(jest.fn());
		progressTracking.completeProgress.mockReturnValue({});
		progressTracking.failProgress.mockReturnValue({});

		// Mock file storage
		fileStorage.getFileInfo.mockResolvedValue({
			exists: true,
			size: 1024
		});

		// Mock fs operations
		fs.promises.writeFile.mockResolvedValue();
		fs.promises.readFile.mockResolvedValue('{"test": "data"}');
		fs.promises.stat.mockResolvedValue({ size: 1024 });
	});

	describe('startRender', () => {
		const mockRenderRequest = {
			videoId: 'test-video-123',
			script: {
				title: 'Test Book',
				author: 'Test Author',
				text: 'This is a test script for video generation. It contains multiple sentences to test the rendering pipeline.'
			},
			audioPath: '/uploads/audio/test-audio.mp3',
			audioDuration: 45,
			mediaAssets: [
				{
					type: 'cover',
					path: '/uploads/covers/test-cover.jpg',
					usage: 'cover'
				},
				{
					type: 'background_image',
					path: '/uploads/library/backgrounds/test-bg.jpg',
					usage: 'background'
				}
			],
			template: {
				name: 'Modern Template',
				resolution: { width: 1920, height: 1080 },
				framerate: 30
			}
		};

		it('should start render process successfully', async () => {
			const result = await videoRenderer.startRender(mockRenderRequest);

			expect(result).toHaveProperty('jobId');
			expect(result).toHaveProperty('progressId');
			expect(result.status).toBe('starting');
			expect(result).toHaveProperty('estimatedDuration');

			expect(progressTracking.initializeProgress).toHaveBeenCalledWith(
				expect.stringContaining('render_'),
				expect.objectContaining({
					steps: expect.arrayContaining([
						'Validating inputs',
						'Creating composition',
						'Processing media assets'
					]),
					totalSteps: 9,
					metadata: expect.objectContaining({
						videoId: mockRenderRequest.videoId,
						type: 'video-render'
					})
				})
			);
		});

		it('should calculate video duration correctly', () => {
			const duration = videoRenderer.calculateVideoDuration(mockRenderRequest);

			// Should be based on script length (rough estimate: 150 words per minute)
			expect(duration).toBeGreaterThan(0);
			expect(duration).toBeLessThanOrEqual(180); // Capped at 3 minutes
		});

		it('should estimate render time based on complexity', () => {
			const estimatedTime = videoRenderer.estimateRenderTime(mockRenderRequest);

			expect(estimatedTime).toMatch(/^\d+m \d+s$/);
		});
	});

	describe('createVideoComposition', () => {
		const mockRequest = {
			videoId: 'test-video-123',
			script: {
				title: 'Test Book',
				author: 'Test Author',
				text: 'Test script content for video generation.'
			},
			audioPath: '/uploads/audio/test-audio.mp3',
			mediaAssets: [
				{
					type: 'cover',
					path: '/uploads/covers/test-cover.jpg',
					usage: 'cover'
				}
			]
		};

		it('should create comprehensive video composition', async () => {
			const composition = await videoRenderer.createVideoComposition(mockRequest);

			expect(composition).toHaveProperty('id', mockRequest.videoId);
			expect(composition).toHaveProperty('duration');
			expect(composition).toHaveProperty('resolution');
			expect(composition).toHaveProperty('framerate');
			expect(composition).toHaveProperty('layers');
			expect(composition).toHaveProperty('audio');
			expect(composition).toHaveProperty('textOverlays');
			expect(composition).toHaveProperty('effects');
			expect(composition).toHaveProperty('transitions');
			expect(composition).toHaveProperty('metadata');
		});

		it('should create video layers from media assets', () => {
			const layers = videoRenderer.createVideoLayers(mockRequest, 60);

			expect(Array.isArray(layers)).toBe(true);

			// Should have cover image layer
			const coverLayer = layers.find(layer => layer.type === 'image');
			expect(coverLayer).toBeDefined();
			expect(coverLayer.zIndex).toBe(2); // Cover should be on top of background
		});

		it('should create text overlays from script', () => {
			const overlays = videoRenderer.createTextOverlays(mockRequest, 60);

			expect(Array.isArray(overlays)).toBe(true);
			expect(overlays.length).toBeGreaterThan(0);

			// Should have title overlay
			const titleOverlay = overlays.find(overlay => overlay.text === mockRequest.script.title);
			expect(titleOverlay).toBeDefined();
			expect(titleOverlay.style.fontSize).toBeGreaterThan(0);
		});
	});

	describe('getRenderJobStatus', () => {
		it('should return null for non-existent job', () => {
			const status = videoRenderer.getRenderJobStatus('non-existent-job');
			expect(status).toBeNull();
		});

		it('should return job status with progress information', async () => {
			// Start a render job first
			const mockRequest = {
				videoId: 'test-video-123',
				script: { title: 'Test', author: 'Author', text: 'Test content' },
				mediaAssets: []
			};

			const renderResult = await videoRenderer.startRender(mockRequest);

			// Mock progress info
			progressTracking.getProgress.mockReturnValue({
				progress: 50,
				currentStep: 2,
				currentStepName: 'Processing media assets'
			});

			const status = videoRenderer.getRenderJobStatus(renderResult.jobId);

			expect(status).toHaveProperty('jobId');
			expect(status).toHaveProperty('videoId', mockRequest.videoId);
			expect(status).toHaveProperty('status');
			expect(status).toHaveProperty('progress');
			expect(status).toHaveProperty('currentStepName');
		});
	});

	describe('calculateComplexity', () => {
		it('should calculate complexity based on request parameters', () => {
			const simpleRequest = {
				script: { text: 'Short script' },
				mediaAssets: []
			};

			const complexRequest = {
				script: { text: 'Very long script with many words to increase complexity calculation' },
				audioPath: '/path/to/audio.mp3',
				mediaAssets: [
					{ type: 'cover' },
					{ type: 'background_image' },
					{ type: 'background_video' },
					{ type: 'background_music' }
				],
				template: {
					effects: [
						{ name: 'fadeIn' },
						{ name: 'fadeOut' },
						{ name: 'kenBurns' }
					]
				}
			};

			const simpleComplexity = videoRenderer.calculateComplexity(simpleRequest);
			const complexComplexity = videoRenderer.calculateComplexity(complexRequest);

			expect(simpleComplexity).toBeLessThan(complexComplexity);
			expect(simpleComplexity).toBeGreaterThanOrEqual(0);
			expect(complexComplexity).toBeLessThanOrEqual(1);
		});
	});

	describe('normalizeVolume', () => {
		it('should normalize volume based on track type', () => {
			const voiceoverVolume = videoRenderer.normalizeVolume(1.0, 'voiceover');
			const musicVolume = videoRenderer.normalizeVolume(1.0, 'background_music');
			const effectVolume = videoRenderer.normalizeVolume(1.0, 'sound_effect');

			expect(voiceoverVolume).toBe(1.0);
			expect(musicVolume).toBe(0.3);
			expect(effectVolume).toBe(0.7);
		});

		it('should cap volume at 1.0', () => {
			const volume = videoRenderer.normalizeVolume(2.0, 'voiceover');
			expect(volume).toBe(1.0);
		});
	});

	describe('calculateLayerPosition', () => {
		const resolution = { width: 1920, height: 1080 };

		it('should convert percentage positions to pixels', () => {
			const position = { x: '50%', y: '25%', width: '80%', height: '60%' };
			const pixelPosition = videoRenderer.calculateLayerPosition(position, resolution);

			expect(pixelPosition.x).toBe(960); // 50% of 1920
			expect(pixelPosition.y).toBe(270); // 25% of 1080
			expect(pixelPosition.width).toBe(1536); // 80% of 1920
			expect(pixelPosition.height).toBe(648); // 60% of 1080
		});

		it('should handle pixel values', () => {
			const position = { x: 100, y: 200, width: 800, height: 600 };
			const pixelPosition = videoRenderer.calculateLayerPosition(position, resolution);

			expect(pixelPosition.x).toBe(100);
			expect(pixelPosition.y).toBe(200);
			expect(pixelPosition.width).toBe(800);
			expect(pixelPosition.height).toBe(600);
		});
	});

	describe('cancelRenderJob', () => {
		it('should cancel active render job', async () => {
			const mockRequest = {
				videoId: 'test-video-123',
				script: { title: 'Test', author: 'Author', text: 'Test content' },
				mediaAssets: []
			};

			const renderResult = await videoRenderer.startRender(mockRequest);
			const cancelled = videoRenderer.cancelRenderJob(renderResult.jobId);

			expect(cancelled).toBe(true);
			expect(progressTracking.cancelProgress).toHaveBeenCalled();
		});

		it('should not cancel completed job', async () => {
			const mockRequest = {
				videoId: 'test-video-123',
				script: { title: 'Test', author: 'Author', text: 'Test content' },
				mediaAssets: []
			};

			const renderResult = await videoRenderer.startRender(mockRequest);

			// Manually set job as completed
			const job = videoRenderer.renderJobs.get(renderResult.jobId);
			job.status = 'completed';

			const cancelled = videoRenderer.cancelRenderJob(renderResult.jobId);
			expect(cancelled).toBe(false);
		});
	});

	describe('getStats', () => {
		it('should return service statistics', () => {
			const stats = videoRenderer.getStats();

			expect(stats).toHaveProperty('totalJobs');
			expect(stats).toHaveProperty('activeJobs');
			expect(stats).toHaveProperty('completedJobs');
			expect(stats).toHaveProperty('failedJobs');
			expect(stats).toHaveProperty('cancelledJobs');
			expect(stats).toHaveProperty('averageRenderTime');

			expect(typeof stats.totalJobs).toBe('number');
			expect(typeof stats.averageRenderTime).toBe('number');
		});
	});

	describe('cleanupCompletedJobs', () => {
		it('should clean up old completed jobs', () => {
			const cleanedCount = videoRenderer.cleanupCompletedJobs(24);
			expect(typeof cleanedCount).toBe('number');
			expect(cleanedCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe('estimateFileSize', () => {
		it('should estimate file size based on composition', () => {
			const composition = {
				duration: 60,
				resolution: { width: 1920, height: 1080 }
			};

			const estimatedSize = videoRenderer.estimateFileSize(composition);

			expect(typeof estimatedSize).toBe('number');
			expect(estimatedSize).toBeGreaterThan(0);
		});

		it('should scale with resolution', () => {
			const hdComposition = {
				duration: 60,
				resolution: { width: 1280, height: 720 }
			};

			const fhdComposition = {
				duration: 60,
				resolution: { width: 1920, height: 1080 }
			};

			const hdSize = videoRenderer.estimateFileSize(hdComposition);
			const fhdSize = videoRenderer.estimateFileSize(fhdComposition);

			expect(fhdSize).toBeGreaterThan(hdSize);
		});
	});
});