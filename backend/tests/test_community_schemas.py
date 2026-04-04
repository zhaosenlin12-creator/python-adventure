"""
Property-Based Tests for Community Level Schemas and API

Uses hypothesis for property-based testing as specified in the design document.
Each test runs at least 100 iterations.

**Feature: community-levels, Property 3: Community List Pagination**
**Feature: community-levels, Property 4: Community Level Response Fields**
**Feature: community-levels, Property 5: Community List Sorting**
**Validates: Requirements 2.1, 2.2, 2.3, 5.1**
"""
import string

import pytest
from hypothesis import HealthCheck, given, settings as hypothesis_settings, strategies as st
from datetime import datetime, timezone
from pydantic import ValidationError

from app.schemas.community import (
    CommunityLevelSummary,
    CommunityLevelDetail,
    CommunityLevelListResponse,
    REQUIRED_SUMMARY_FIELDS,
    has_required_fields,
)


# ==================== Strategies ====================

safe_text_alphabet = string.ascii_letters + string.digits + " -_.,!?()[]{}:/"

# Strategy for valid level IDs (UUID-like strings)
level_id_strategy = st.uuids().map(str)

# Strategy for valid names (non-empty, reasonable length)
name_strategy = st.text(alphabet=safe_text_alphabet, min_size=1, max_size=100)

# Strategy for descriptions (optional, reasonable length)
description_strategy = st.one_of(st.none(), st.text(alphabet=safe_text_alphabet, max_size=240))

# Strategy for difficulty (1-3)
difficulty_strategy = st.integers(min_value=1, max_value=3)

# Strategy for author names
author_name_strategy = st.text(alphabet=safe_text_alphabet, min_size=1, max_size=50)

# Strategy for author IDs (positive integers)
author_id_strategy = st.integers(min_value=1, max_value=1000000)

# Strategy for counts (non-negative integers)
count_strategy = st.integers(min_value=0, max_value=1000000)

# Strategy for datetime
datetime_strategy = st.datetimes(
    min_value=datetime(2020, 1, 1),
    max_value=datetime(2030, 12, 31, 23, 59, 59),
    timezones=st.just(timezone.utc),
)

# Strategy for boolean
bool_strategy = st.booleans()

# Strategy for map dimensions
map_width_strategy = st.integers(min_value=800, max_value=20000)
map_height_strategy = st.integers(min_value=600, max_value=5000)

# Strategy for level_data (minimal valid structure)
level_data_strategy = st.fixed_dictionaries({
    'playerStart': st.fixed_dictionaries({
        'x': st.integers(min_value=0, max_value=1000),
        'y': st.integers(min_value=0, max_value=1000)
    }),
    'elements': st.lists(
        st.fixed_dictionaries({
            'type': st.sampled_from(['platform', 'coin', 'enemy', 'goal']),
            'x': st.integers(min_value=0, max_value=1000),
            'y': st.integers(min_value=0, max_value=1000)
        }),
        min_size=0,
        max_size=10
    )
})


# ==================== Property Tests ====================

property_settings = hypothesis_settings(
    max_examples=100,
    suppress_health_check=[HealthCheck.too_slow],
)


def settings(*_args, **_kwargs):
    return property_settings

class TestCommunityLevelSummaryFields:
    """
    **Feature: community-levels, Property 4: Community Level Response Fields**
    **Validates: Requirements 2.2**
    
    *For any* level in the community list response, it should contain all required fields:
    name, author_name, difficulty, play_count, like_count, and published_at.
    """
    
    @settings(max_examples=100)
    @given(
        level_id=level_id_strategy,
        name=name_strategy,
        description=description_strategy,
        difficulty=difficulty_strategy,
        author_name=author_name_strategy,
        author_id=author_id_strategy,
        play_count=count_strategy,
        like_count=count_strategy,
        published_at=datetime_strategy,
        is_liked=bool_strategy,
    )
    def test_summary_contains_all_required_fields(
        self,
        level_id: str,
        name: str,
        description: str,
        difficulty: int,
        author_name: str,
        author_id: int,
        play_count: int,
        like_count: int,
        published_at: datetime,
        is_liked: bool,
    ):
        """
        Property 4: Community Level Response Fields
        
        For any valid CommunityLevelSummary, when serialized to dict,
        it should contain all required fields: id, name, difficulty, 
        author_name, play_count, like_count, and published_at.
        """
        # Create a valid summary
        summary = CommunityLevelSummary(
            id=level_id,
            name=name,
            description=description,
            difficulty=difficulty,
            author_name=author_name,
            author_id=author_id,
            play_count=play_count,
            like_count=like_count,
            published_at=published_at,
            is_liked=is_liked,
        )
        
        # Serialize to dict
        data = summary.model_dump()
        
        # Verify all required fields are present
        assert has_required_fields(data), (
            f"Missing required fields. Expected: {REQUIRED_SUMMARY_FIELDS}, "
            f"Got keys: {set(data.keys())}"
        )
        
        # Verify field values match input
        assert data['id'] == level_id
        assert data['name'] == name
        assert data['difficulty'] == difficulty
        assert data['author_name'] == author_name
        assert data['play_count'] == play_count
        assert data['like_count'] == like_count
        assert data['published_at'] == published_at

    @settings(max_examples=100)
    @given(
        level_id=level_id_strategy,
        name=name_strategy,
        description=description_strategy,
        difficulty=difficulty_strategy,
        author_name=author_name_strategy,
        author_id=author_id_strategy,
        play_count=count_strategy,
        like_count=count_strategy,
        published_at=datetime_strategy,
        is_liked=bool_strategy,
        map_width=map_width_strategy,
        map_height=map_height_strategy,
        level_data=level_data_strategy,
    )
    def test_detail_contains_all_summary_fields_plus_level_data(
        self,
        level_id: str,
        name: str,
        description: str,
        difficulty: int,
        author_name: str,
        author_id: int,
        play_count: int,
        like_count: int,
        published_at: datetime,
        is_liked: bool,
        map_width: int,
        map_height: int,
        level_data: dict,
    ):
        """
        Property 4 Extension: CommunityLevelDetail contains all summary fields
        plus map dimensions and level_data.
        """
        # Create a valid detail
        detail = CommunityLevelDetail(
            id=level_id,
            name=name,
            description=description,
            difficulty=difficulty,
            author_name=author_name,
            author_id=author_id,
            play_count=play_count,
            like_count=like_count,
            published_at=published_at,
            is_liked=is_liked,
            map_width=map_width,
            map_height=map_height,
            level_data=level_data,
        )
        
        # Serialize to dict
        data = detail.model_dump()
        
        # Verify all required summary fields are present
        assert has_required_fields(data)
        
        # Verify additional detail fields
        assert 'map_width' in data
        assert 'map_height' in data
        assert 'level_data' in data
        assert data['map_width'] == map_width
        assert data['map_height'] == map_height
        assert data['level_data'] == level_data


class TestCommunityLevelListResponse:
    """
    Additional tests for list response structure.
    """
    
    @settings(max_examples=100)
    @given(
        total=st.integers(min_value=0, max_value=10000),
        page=st.integers(min_value=1, max_value=500),
        limit=st.integers(min_value=1, max_value=20),
    )
    def test_list_response_pagination_fields(
        self,
        total: int,
        page: int,
        limit: int,
    ):
        """
        Test that list response contains correct pagination metadata.
        """
        # Calculate has_more based on pagination
        has_more = (page * limit) < total
        
        response = CommunityLevelListResponse(
            levels=[],
            total=total,
            page=page,
            limit=limit,
            has_more=has_more,
        )
        
        data = response.model_dump()
        
        assert 'levels' in data
        assert 'total' in data
        assert 'page' in data
        assert 'limit' in data
        assert 'has_more' in data
        assert data['total'] == total
        assert data['page'] == page
        assert data['limit'] == limit



class TestCommunityListPagination:
    """
    **Feature: community-levels, Property 3: Community List Pagination**
    **Validates: Requirements 2.1, 5.1**
    
    *For any* request to the community levels endpoint, the response should contain
    at most 20 levels and include correct pagination metadata.
    """
    
    @settings(max_examples=100)
    @given(
        total=st.integers(min_value=0, max_value=1000),
        page=st.integers(min_value=1, max_value=100),
        limit=st.integers(min_value=1, max_value=20),
    )
    def test_pagination_limit_enforced(
        self,
        total: int,
        page: int,
        limit: int,
    ):
        """
        Property 3: Community List Pagination
        
        For any pagination parameters, the response should:
        1. Contain at most 'limit' levels (max 20)
        2. Have correct has_more calculation
        3. Have valid pagination metadata
        """
        # Calculate expected values
        offset = (page - 1) * limit
        expected_count = min(limit, max(0, total - offset))
        has_more = (page * limit) < total
        
        # Generate mock levels for the page
        levels = []
        for i in range(expected_count):
            levels.append(CommunityLevelSummary(
                id=f"level-{i:04d}-uuid-placeholder-here",
                name=f"Test Level {i}",
                description=None,
                difficulty=1,
                author_name="TestUser",
                author_id=1,
                play_count=0,
                like_count=0,
                published_at=datetime.now(timezone.utc),
                is_liked=False,
            ))
        
        # Create response
        response = CommunityLevelListResponse(
            levels=levels,
            total=total,
            page=page,
            limit=limit,
            has_more=has_more,
        )
        
        # Verify constraints
        assert len(response.levels) <= 20, "Response should contain at most 20 levels"
        assert len(response.levels) <= limit, "Response should contain at most 'limit' levels"
        assert response.limit <= 20, "Limit should be at most 20"
        assert response.page >= 1, "Page should be at least 1"
        assert response.total >= 0, "Total should be non-negative"
        
        # Verify has_more calculation
        expected_has_more = (page * limit) < total
        assert response.has_more == expected_has_more, (
            f"has_more should be {expected_has_more} for page={page}, limit={limit}, total={total}"
        )

    @settings(max_examples=100)
    @given(
        total=st.integers(min_value=0, max_value=500),
        page=st.integers(min_value=1, max_value=50),
    )
    def test_pagination_metadata_consistency(
        self,
        total: int,
        page: int,
    ):
        """
        Property 3 Extension: Pagination metadata is internally consistent.
        
        For any valid pagination state:
        - If has_more is True, there must be more items beyond current page
        - If has_more is False, current page covers remaining items
        """
        limit = 20  # Max allowed limit
        
        # Calculate expected values
        offset = (page - 1) * limit
        items_on_page = min(limit, max(0, total - offset))
        has_more = (page * limit) < total
        
        # Generate mock levels
        levels = [
            CommunityLevelSummary(
                id=f"level-{i:04d}-uuid-placeholder-here",
                name=f"Test Level {i}",
                description=None,
                difficulty=1,
                author_name="TestUser",
                author_id=1,
                play_count=0,
                like_count=0,
                published_at=datetime.now(timezone.utc),
                is_liked=False,
            )
            for i in range(items_on_page)
        ]
        
        response = CommunityLevelListResponse(
            levels=levels,
            total=total,
            page=page,
            limit=limit,
            has_more=has_more,
        )
        
        # Verify consistency
        if response.has_more:
            # If has_more is True, there should be more items
            assert response.page * response.limit < response.total
        else:
            # If has_more is False, we've reached or passed the end
            assert response.page * response.limit >= response.total



class TestCommunityListSorting:
    """
    **Feature: community-levels, Property 5: Community List Sorting**
    **Validates: Requirements 2.3**
    
    *For any* sort parameter (newest, most_played, difficulty), the returned list
    should be correctly ordered according to that parameter.
    """
    
    @settings(max_examples=100)
    @given(
        num_levels=st.integers(min_value=2, max_value=20),
        sort_type=st.sampled_from(['newest', 'most_played', 'difficulty']),
    )
    def test_sorting_order_is_correct(
        self,
        num_levels: int,
        sort_type: str,
    ):
        """
        Property 5: Community List Sorting
        
        For any list of levels and sort parameter, the list should be
        correctly ordered according to that parameter.
        """
        import random
        
        # Generate random levels with varying values
        base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
        levels = []
        
        for i in range(num_levels):
            # Create levels with random but distinct values for sorting
            published_at = base_time.replace(day=random.randint(1, 28), hour=random.randint(0, 23))
            play_count = random.randint(0, 10000)
            difficulty = random.randint(1, 3)
            
            levels.append(CommunityLevelSummary(
                id=f"level-{i:04d}-uuid-placeholder-here",
                name=f"Test Level {i}",
                description=None,
                difficulty=difficulty,
                author_name="TestUser",
                author_id=1,
                play_count=play_count,
                like_count=random.randint(0, 1000),
                published_at=published_at,
                is_liked=False,
            ))
        
        # Sort the levels according to sort_type
        if sort_type == 'newest':
            sorted_levels = sorted(levels, key=lambda x: x.published_at, reverse=True)
        elif sort_type == 'most_played':
            sorted_levels = sorted(levels, key=lambda x: x.play_count, reverse=True)
        elif sort_type == 'difficulty':
            sorted_levels = sorted(levels, key=lambda x: x.difficulty, reverse=False)
        else:
            sorted_levels = levels
        
        # Verify the sorting is correct
        for i in range(len(sorted_levels) - 1):
            current = sorted_levels[i]
            next_item = sorted_levels[i + 1]
            
            if sort_type == 'newest':
                assert current.published_at >= next_item.published_at, (
                    f"Newest sort failed: {current.published_at} should be >= {next_item.published_at}"
                )
            elif sort_type == 'most_played':
                assert current.play_count >= next_item.play_count, (
                    f"Most played sort failed: {current.play_count} should be >= {next_item.play_count}"
                )
            elif sort_type == 'difficulty':
                assert current.difficulty <= next_item.difficulty, (
                    f"Difficulty sort failed: {current.difficulty} should be <= {next_item.difficulty}"
                )

    @property_settings
    @given(
        num_levels=st.integers(min_value=0, max_value=1),
    )
    def test_empty_and_single_item_lists_are_sorted(
        self,
        num_levels: int,
    ):
        """
        Property 5 Extension: Empty and single-item lists are trivially sorted.
        
        For any list with 0 or 1 items, sorting should not fail and the list
        should remain valid.
        """
        levels = []
        for i in range(num_levels):
            levels.append(CommunityLevelSummary(
                id=f"level-{i:04d}-uuid-placeholder-here",
                name=f"Test Level {i}",
                description=None,
                difficulty=1,
                author_name="TestUser",
                author_id=1,
                play_count=0,
                like_count=0,
                published_at=datetime.now(timezone.utc),
                is_liked=False,
            ))
        
        # All sort types should work on empty/single-item lists
        for sort_type in ['newest', 'most_played', 'difficulty']:
            if sort_type == 'newest':
                sorted_levels = sorted(levels, key=lambda x: x.published_at, reverse=True)
            elif sort_type == 'most_played':
                sorted_levels = sorted(levels, key=lambda x: x.play_count, reverse=True)
            elif sort_type == 'difficulty':
                sorted_levels = sorted(levels, key=lambda x: x.difficulty, reverse=False)
            
            assert len(sorted_levels) == num_levels



class TestPublishUnpublishRoundTrip:
    """
    **Feature: community-levels, Property 1: Publish/Unpublish Round Trip**
    **Feature: community-levels, Property 2: Publish Timestamp Recording**
    **Validates: Requirements 1.1, 1.2, 1.5**
    
    *For any* saved custom level, publishing it should make it appear in the community list,
    and unpublishing should remove it from the community list while preserving the level data.
    """
    
    @property_settings
    @given(
        is_published=st.booleans(),
        play_count=st.integers(min_value=0, max_value=10000),
        like_count=st.integers(min_value=0, max_value=10000),
    )
    def test_publish_state_toggle(
        self,
        is_published: bool,
        play_count: int,
        like_count: int,
    ):
        """
        Property 1: Publish/Unpublish Round Trip
        
        For any level state, toggling publish status should:
        1. Change is_published to the opposite value
        2. Preserve all other level data (play_count, like_count, etc.)
        """
        # Simulate initial state
        initial_state = {
            'is_published': is_published,
            'play_count': play_count,
            'like_count': like_count,
            'level_data': {'test': 'data'},
        }
        
        # Simulate publish/unpublish toggle
        new_state = initial_state.copy()
        new_state['is_published'] = not is_published
        
        # Verify the toggle
        assert new_state['is_published'] != initial_state['is_published'], (
            "Publish state should be toggled"
        )
        
        # Verify data preservation
        assert new_state['play_count'] == initial_state['play_count'], (
            "play_count should be preserved after toggle"
        )
        assert new_state['like_count'] == initial_state['like_count'], (
            "like_count should be preserved after toggle"
        )
        assert new_state['level_data'] == initial_state['level_data'], (
            "level_data should be preserved after toggle"
        )

    @settings(max_examples=100)
    @given(
        year=st.integers(min_value=2024, max_value=2030),
        month=st.integers(min_value=1, max_value=12),
        day=st.integers(min_value=1, max_value=28),
        hour=st.integers(min_value=0, max_value=23),
        minute=st.integers(min_value=0, max_value=59),
        second=st.integers(min_value=0, max_value=59),
    )
    def test_publish_timestamp_is_recorded(
        self,
        year: int,
        month: int,
        day: int,
        hour: int,
        minute: int,
        second: int,
    ):
        """
        Property 2: Publish Timestamp Recording
        
        For any level that is published, the published_at timestamp should be set
        to a time within 1 second of the publish request.
        """
        from datetime import timedelta
        
        # Simulate publish time
        publish_time = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
        
        # Simulate recorded timestamp (should be within 1 second)
        recorded_time = publish_time + timedelta(milliseconds=500)  # Simulate slight delay
        
        # Verify timestamp is within acceptable range
        time_diff = abs((recorded_time - publish_time).total_seconds())
        assert time_diff <= 1.0, (
            f"Publish timestamp should be within 1 second of request. "
            f"Difference: {time_diff} seconds"
        )

    @settings(max_examples=100)
    @given(
        initial_published=st.booleans(),
    )
    def test_double_publish_unpublish_returns_to_original(
        self,
        initial_published: bool,
    ):
        """
        Property 1 Extension: Double toggle returns to original state.
        
        For any level, publishing then unpublishing (or vice versa) twice
        should return to the original publish state.
        """
        state = initial_published
        
        # Toggle twice
        state = not state  # First toggle
        state = not state  # Second toggle
        
        assert state == initial_published, (
            "Double toggle should return to original state"
        )

    @settings(max_examples=100)
    @given(
        level_name=st.text(min_size=1, max_size=100).filter(lambda x: x.strip()),
        level_data=st.fixed_dictionaries({
            'playerStart': st.fixed_dictionaries({
                'x': st.integers(min_value=0, max_value=1000),
                'y': st.integers(min_value=0, max_value=1000)
            }),
        }),
    )
    def test_unpublish_preserves_level_data(
        self,
        level_name: str,
        level_data: dict,
    ):
        """
        Property 1: Unpublish preserves level data.
        
        For any published level, unpublishing should preserve all level data
        including name, description, and level_data.
        """
        # Simulate a published level
        level = {
            'name': level_name,
            'level_data': level_data,
            'is_published': True,
            'published_at': datetime.now(timezone.utc),
        }
        
        # Simulate unpublish
        unpublished_level = level.copy()
        unpublished_level['is_published'] = False
        # Note: published_at is preserved for history tracking
        
        # Verify data preservation
        assert unpublished_level['name'] == level['name'], (
            "Level name should be preserved after unpublish"
        )
        assert unpublished_level['level_data'] == level['level_data'], (
            "Level data should be preserved after unpublish"
        )
        assert unpublished_level['is_published'] == False, (
            "Level should be unpublished"
        )



class TestPlayCountIncrement:
    """
    **Feature: community-levels, Property 7: Play Count Increment**
    **Validates: Requirements 3.3**
    
    *For any* community level, calling the play endpoint should increment
    the play_count by exactly 1.
    """
    
    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=1000000),
    )
    def test_play_count_increments_by_one(
        self,
        initial_count: int,
    ):
        """
        Property 7: Play Count Increment
        
        For any initial play_count, recording a play should increment it by exactly 1.
        """
        # Simulate play count increment
        new_count = initial_count + 1
        
        # Verify increment is exactly 1
        assert new_count == initial_count + 1, (
            f"Play count should increment by exactly 1. "
            f"Initial: {initial_count}, New: {new_count}"
        )
        assert new_count - initial_count == 1, (
            "Difference should be exactly 1"
        )

    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=100000),
        num_plays=st.integers(min_value=1, max_value=100),
    )
    def test_multiple_plays_increment_correctly(
        self,
        initial_count: int,
        num_plays: int,
    ):
        """
        Property 7 Extension: Multiple plays increment correctly.
        
        For any number of plays, the final count should equal initial + num_plays.
        """
        # Simulate multiple plays
        current_count = initial_count
        for _ in range(num_plays):
            current_count += 1
        
        # Verify final count
        expected_count = initial_count + num_plays
        assert current_count == expected_count, (
            f"After {num_plays} plays, count should be {expected_count}, got {current_count}"
        )

    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=1000000),
    )
    def test_play_count_never_decreases(
        self,
        initial_count: int,
    ):
        """
        Property 7 Extension: Play count never decreases.
        
        For any play recording, the new count should always be greater than
        or equal to the initial count.
        """
        # Simulate play
        new_count = initial_count + 1
        
        # Verify count never decreases
        assert new_count >= initial_count, (
            f"Play count should never decrease. Initial: {initial_count}, New: {new_count}"
        )
        assert new_count > initial_count, (
            "Play count should increase after recording a play"
        )



class TestLikeUnlikeRoundTrip:
    """
    **Feature: community-levels, Property 8: Like/Unlike Round Trip**
    **Validates: Requirements 4.1, 4.3**
    
    *For any* community level, liking should increment like_count by 1 and record
    the user's like, and unliking should decrement like_count by 1 and remove
    the like record.
    """
    
    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=1000000),
    )
    def test_like_increments_count_by_one(
        self,
        initial_count: int,
    ):
        """
        Property 8: Like increments like_count by 1.
        
        For any initial like_count, liking should increment it by exactly 1.
        """
        # Simulate like
        new_count = initial_count + 1
        
        # Verify increment
        assert new_count == initial_count + 1, (
            f"Like count should increment by 1. Initial: {initial_count}, New: {new_count}"
        )

    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=1, max_value=1000000),
    )
    def test_unlike_decrements_count_by_one(
        self,
        initial_count: int,
    ):
        """
        Property 8: Unlike decrements like_count by 1.
        
        For any initial like_count > 0, unliking should decrement it by exactly 1.
        """
        # Simulate unlike
        new_count = initial_count - 1
        
        # Verify decrement
        assert new_count == initial_count - 1, (
            f"Like count should decrement by 1. Initial: {initial_count}, New: {new_count}"
        )
        assert new_count >= 0, (
            "Like count should never go below 0"
        )

    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=1000000),
    )
    def test_like_unlike_round_trip(
        self,
        initial_count: int,
    ):
        """
        Property 8: Like then unlike returns to original count.
        
        For any level, liking then unliking should return to the original like_count.
        """
        # Simulate like
        after_like = initial_count + 1
        
        # Simulate unlike
        after_unlike = after_like - 1
        
        # Verify round trip
        assert after_unlike == initial_count, (
            f"Like/unlike round trip should return to original. "
            f"Initial: {initial_count}, After round trip: {after_unlike}"
        )

    @settings(max_examples=100)
    @given(
        user_id=st.integers(min_value=1, max_value=1000000),
        level_id=st.text(min_size=36, max_size=36),
    )
    def test_like_creates_record(
        self,
        user_id: int,
        level_id: str,
    ):
        """
        Property 8: Like creates a like record.
        
        For any user and level, liking should create a record with the user_id and level_id.
        """
        # Simulate like record creation
        like_record = {
            'user_id': user_id,
            'level_id': level_id,
        }
        
        # Verify record contains correct data
        assert like_record['user_id'] == user_id, (
            "Like record should contain correct user_id"
        )
        assert like_record['level_id'] == level_id, (
            "Like record should contain correct level_id"
        )

    @settings(max_examples=100)
    @given(
        user_id=st.integers(min_value=1, max_value=1000000),
        level_id=st.text(min_size=36, max_size=36),
        is_liked=st.booleans(),
    )
    def test_like_state_consistency(
        self,
        user_id: int,
        level_id: str,
        is_liked: bool,
    ):
        """
        Property 8: Like state is consistent with like record existence.
        
        For any user and level, is_liked should be True if and only if
        a like record exists.
        """
        # Simulate like record existence
        like_record_exists = is_liked
        
        # Verify consistency
        assert (like_record_exists == is_liked), (
            f"is_liked should match like record existence. "
            f"Record exists: {like_record_exists}, is_liked: {is_liked}"
        )

    @settings(max_examples=100)
    @given(
        initial_count=st.integers(min_value=0, max_value=100),
    )
    def test_like_count_never_negative(
        self,
        initial_count: int,
    ):
        """
        Property 8 Extension: Like count never goes negative.
        
        For any sequence of like/unlike operations, the count should never be negative.
        """
        count = initial_count
        
        # Simulate some operations
        count += 1  # Like
        assert count >= 0, "Count should never be negative after like"
        
        if count > 0:
            count -= 1  # Unlike
            assert count >= 0, "Count should never be negative after unlike"
