    -- =========================================================================
    --  GARF (Gaming Arena & Recreation Finder) - SUPABASE MIGRATION SCRIPT
    --  Run this script in your Supabase SQL Editor to apply the gaming_cafes table!
    -- =========================================================================

    -- 1. Check and rename existing table, or create new if not present
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'venues') THEN
            -- Rename the table
            ALTER TABLE venues RENAME TO gaming_cafes;
            RAISE NOTICE 'Renamed table venues to gaming_cafes.';
        ELSE
            -- Create gaming_cafes table from scratch if venues didn't exist
            IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gaming_cafes') THEN
                CREATE TABLE gaming_cafes (
                    id TEXT PRIMARY KEY,
                    owner_id TEXT REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('gaming_cafe', 'turf', 'both')),
                    description TEXT NOT NULL,
                    address TEXT NOT NULL,
                    city TEXT NOT NULL,
                    state TEXT NOT NULL,
                    pincode TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    email TEXT NOT NULL,
                    cover_image TEXT,
                    gallery_images TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
                    amenities TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
                    games_available TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
                    price_per_hour NUMERIC(10,2) DEFAULT 0 NOT NULL,
                    rating NUMERIC(3,2) DEFAULT 0.00 NOT NULL,
                    total_reviews INTEGER DEFAULT 0 NOT NULL,
                    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE NOT NULL,
                    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
                    is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
                    operating_hours_start TEXT DEFAULT '09:00' NOT NULL,
                    operating_hours_end TEXT DEFAULT '23:00' NOT NULL,
                    operating_days TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
                    commission_percent NUMERIC(5,2) DEFAULT 10.00 NOT NULL,
                    rejection_reason TEXT,
                    verified_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                );
                RAISE NOTICE 'Created table gaming_cafes.';
            END IF;
        END IF;
    END $$;

    -- 2. Add status column to gaming_cafes if it does not exist
    ALTER TABLE gaming_cafes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL;

    -- 3. Backfill status based on is_verified field for existing entries
    UPDATE gaming_cafes SET status = 'approved' WHERE is_verified = TRUE AND status = 'pending';
    UPDATE gaming_cafes SET status = 'rejected' WHERE rejection_reason IS NOT NULL AND status = 'pending';

    -- 4. Enable Real-Time replication for gaming_cafes
    DO $$
    BEGIN
        -- Remove venues from replication if it exists in the publication
        IF EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'venues'
        ) THEN
            ALTER PUBLICATION supabase_realtime DROP TABLE venues;
        END IF;

        -- Add gaming_cafes to replication if not already replicated
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gaming_cafes') AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gaming_cafes'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE gaming_cafes;
        END IF;
    END $$;

    -- 5. Row Level Security and Policies for gaming_cafes
    ALTER TABLE gaming_cafes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read access to gaming_cafes" ON gaming_cafes;
    CREATE POLICY "Allow public read access to gaming_cafes" ON gaming_cafes
        FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON gaming_cafes;
    CREATE POLICY "Allow insert access to authenticated users" ON gaming_cafes
        FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow update access to owners and admins" ON gaming_cafes;
    CREATE POLICY "Allow update access to owners and admins" ON gaming_cafes
        FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Allow delete access to admins" ON gaming_cafes;
    CREATE POLICY "Allow delete access to admins" ON gaming_cafes
        FOR DELETE USING (true);
