const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
	constructor() {
		this.db = null;
		this.isInitialized = false;
		this.connectionCount = 0;
		this.queryCount = 0;
		this.lastError = null;
	}

	/**
	 * Log database operations
	 * @param {string} operation 
	 * @param {string} details 
	 * @param {string} level 
	 * @private
	 */
	_log(operation, details, level = 'info') {
		const timestamp = new Date().toISOString();
		const message = `[${timestamp}] DB ${operation}: ${details}`;

		switch (level) {
			case 'error':
				console.error(`❌ ${message}`);
				this.lastError = { operation, details, timestamp };
				break;
			case 'warn':
				console.warn(`⚠️ ${message}`);
				break;
			case 'debug':
				if (process.env.NODE_ENV === 'development' || process.env.DB_DEBUG === 'true') {
					console.log(`🔍 ${message}`);
				}
				break;
			default:
				if (process.env.NODE_ENV === 'development') {
					console.log(`📊 ${message}`);
				}
		}
	}

	/**
	 * Initialize the database connection
	 * @param {string|null} dbPath - Path to the SQLite database file
	 * @returns {import('better-sqlite3').Database} SQLite database instance
	 * @throws {Error} When database initialization fails
	 */
	initialize(dbPath = null) {
		if (this.db && this.isInitialized) {
			return this.db;
		}

		// Use environment variable or default path
		const databasePath = dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'bookvid.db');

		// Ensure the directory exists
		const dbDir = path.dirname(databasePath);
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}

		try {
			// Create database connection with timeout and retry logic
			this.db = new Database(databasePath, {
				verbose: process.env.NODE_ENV === 'development' ? console.log : null,
				timeout: 10000, // 10 second timeout
				fileMustExist: false
			});

			// Test connection with a simple query
			this.db.prepare('SELECT 1').get();

			// Configure database settings
			this._configurePragmas();

			this.isInitialized = true;
			console.log(`📊 Database connected: ${databasePath}`);

			return this.db;
		} catch (error) {
			console.error('❌ Database connection failed:', error);

			// Attempt recovery for common issues
			if (error.code === 'SQLITE_CORRUPT') {
				console.log('🔧 Attempting database recovery...');
				this._attemptRecovery(databasePath);
			}

			throw new Error(`Database initialization failed: ${error.message}`);
		}
	}

	/**
	 * Validate database connection health
	 * @returns {boolean}
	 */
	isHealthy() {
		if (!this.db || !this.isInitialized) {
			return false;
		}

		try {
			// Test with a simple query
			this.db.prepare('SELECT 1 as test').get();
			return true;
		} catch (error) {
			console.error('❌ Database health check failed:', error);
			return false;
		}
	}

	/**
	 * Get the database instance with health check
	 * @returns {Database} SQLite database instance
	 */
	getDatabase() {
		if (!this.db || !this.isInitialized) {
			throw new Error('Database not initialized. Call initialize() first.');
		}

		// Perform health check
		if (!this.isHealthy()) {
			console.warn('⚠️ Database connection unhealthy, attempting reconnection...');
			try {
				this.close();
				this.initialize();
			} catch (error) {
				throw new Error(`Database reconnection failed: ${error.message}`);
			}
		}

		return this.db;
	}

	/**
	 * Get database statistics
	 * @returns {Object}
	 */
	getStats() {
		if (!this.db) {
			return null;
		}

		try {
			const pageCount = this.db.pragma('page_count', { simple: true });
			const pageSize = this.db.pragma('page_size', { simple: true });
			const cacheSize = this.db.pragma('cache_size', { simple: true });
			const journalMode = this.db.pragma('journal_mode', { simple: true });

			return {
				pageCount,
				pageSize,
				cacheSize,
				journalMode,
				databaseSize: pageCount * pageSize,
				isHealthy: this.isHealthy()
			};
		} catch (error) {
			console.error('❌ Failed to get database stats:', error);
			return null;
		}
	}

	/**
	 * Find migration file with fallback paths
	 * @param {string} filename 
	 * @returns {string}
	 * @private
	 */
	_findMigrationFile(filename) {
		const possiblePaths = [
			path.join(process.cwd(), 'scripts', 'db-migrations', filename),
			path.join(process.cwd(), '..', 'scripts', 'db-migrations', filename),
			path.join(__dirname, '..', '..', 'scripts', 'db-migrations', filename)
		];

		for (const filePath of possiblePaths) {
			if (fs.existsSync(filePath)) {
				return filePath;
			}
		}

		throw new Error(`Migration file not found: ${filename}. Searched paths: ${possiblePaths.join(', ')}`);
	}

	/**
	 * Execute SQL statements from file
	 * @param {string} filePath 
	 * @param {string} description 
	 * @private
	 */
	_executeSqlFile(filePath, description) {
		const sqlContent = fs.readFileSync(filePath, 'utf8');
		const statements = sqlContent
			.split(';')
			.map(stmt => stmt.trim())
			.filter(stmt => stmt && !stmt.startsWith('--'));

		const transaction = this.db.transaction(() => {
			for (const statement of statements) {
				try {
					this.db.exec(statement);
				} catch (error) {
					console.error(`❌ Failed to execute statement: ${statement.substring(0, 100)}...`);
					throw error;
				}
			}
		});

		transaction();
		console.log(`✅ ${description} completed successfully`);
	}

	/**
	 * Check if migrations have been run
	 * @returns {boolean}
	 */
	_hasMigrations() {
		try {
			const result = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
			return !!result;
		} catch {
			return false;
		}
	}

	/**
	 * Run database migrations
	 * @param {boolean} force - Force re-run migrations
	 */
	runMigrations(force = false) {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		try {
			// Skip if already migrated (unless forced)
			if (!force && this._hasMigrations()) {
				console.log('📊 Database already migrated, skipping...');
				return;
			}

			console.log('🔄 Running database migrations...');

			// Execute schema
			const schemaPath = this._findMigrationFile('schema.sql');
			this._executeSqlFile(schemaPath, 'Database schema creation');

			// Execute seed data
			const seedPath = this._findMigrationFile('seed-templates.sql');
			this._executeSqlFile(seedPath, 'Database seeding');

		} catch (error) {
			console.error('❌ Migration failed:', error);
			throw new Error(`Migration failed: ${error.message}`);
		}
	}

	/**
	 * Get database configuration from environment
	 * @returns {Object}
	 * @private
	 */
	_getConfig() {
		return {
			timeout: parseInt(process.env.DB_TIMEOUT) || 10000,
			cacheSize: parseInt(process.env.DB_CACHE_SIZE) || -64000, // 64MB default
			mmapSize: parseInt(process.env.DB_MMAP_SIZE) || 268435456, // 256MB default
			journalMode: process.env.DB_JOURNAL_MODE || 'WAL',
			synchronous: process.env.DB_SYNCHRONOUS || 'NORMAL',
			tempStore: process.env.DB_TEMP_STORE || 'MEMORY'
		};
	}

	/**
	 * Configure database pragmas for optimal performance
	 * @private
	 */
	_configurePragmas() {
		const config = this._getConfig();

		// Enable foreign key constraints
		this.db.pragma('foreign_keys = ON');

		// Set journal mode
		this.db.pragma(`journal_mode = ${config.journalMode}`);

		// Set synchronous mode
		this.db.pragma(`synchronous = ${config.synchronous}`);

		// Set cache size (negative value = KB, positive = pages)
		this.db.pragma(`cache_size = ${config.cacheSize}`);

		// Set temp store
		this.db.pragma(`temp_store = ${config.tempStore}`);

		// Set mmap size for better I/O performance
		this.db.pragma(`mmap_size = ${config.mmapSize}`);
	}

	/**
	 * Attempt database recovery
	 * @param {string} databasePath 
	 * @private
	 */
	_attemptRecovery(databasePath) {
		try {
			const backupPath = `${databasePath}.backup`;
			if (fs.existsSync(backupPath)) {
				fs.copyFileSync(backupPath, databasePath);
				console.log('✅ Database restored from backup');
			}
		} catch (recoveryError) {
			console.error('❌ Database recovery failed:', recoveryError);
		}
	}

	/**
	 * Create database backup
	 */
	createBackup() {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		try {
			const databasePath = this.db.name;
			const backupPath = `${databasePath}.backup`;

			// Use SQLite backup API for consistent backup
			const backup = this.db.backup(backupPath);
			backup.step(-1); // Copy entire database
			backup.finish();

			console.log(`📋 Database backup created: ${backupPath}`);
		} catch (error) {
			console.error('❌ Backup creation failed:', error);
			throw error;
		}
	}

	/**
	 * Close the database connection
	 */
	close() {
		if (this.db) {
			try {
				// Create backup before closing
				this.createBackup();

				this.db.close();
				this.db = null;
				this.isInitialized = false;
				console.log('📊 Database connection closed');
			} catch (error) {
				console.error('❌ Error during database close:', error);
				// Force close even if backup fails
				if (this.db) {
					this.db.close();
					this.db = null;
					this.isInitialized = false;
				}
			}
		}
	}

	/**
	 * Execute a transaction
	 * @param {Function} callback - Function to execute within transaction
	 * @returns {*} Result of the callback
	 */
	transaction(callback) {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		const transaction = this.db.transaction(callback);
		return transaction();
	}

	/**
	 * Prepare a statement for reuse
	 * @param {string} sql - SQL statement
	 * @returns {Statement} Prepared statement
	 */
	prepare(sql) {
		if (!this.db) {
			throw new Error('Database not initialized');
		}

		return this.db.prepare(sql);
	}
}

// Create singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;