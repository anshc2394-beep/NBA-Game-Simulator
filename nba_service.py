import json
import os
import random
from dataclasses import dataclass
from typing import Dict, List, Optional

from nba_api.stats.endpoints import commonplayerinfo, playercareerstats
from nba_api.stats.static import players, teams

METADATA_CACHE_PATH = 'player_metadata.json'


@dataclass
class PlayerProfile:
    id: int
    full_name: str
    team_abbreviation: str
    position: str
    rating: float
    career_ppg: float
    career_apg: float
    career_rpg: float


class NBAService:
    def __init__(self, metadata_path: str = METADATA_CACHE_PATH):
        self.metadata_path = metadata_path
        self._all_players: List[Dict] = []
        self._active_players_map: Dict[int, Dict] = {}
        self._player_cache: List[PlayerProfile] = []
        self._metadata_cache: Dict[str, Dict] = {}
        self._load_players()
        self._load_metadata_cache()

    def _load_players(self) -> None:
        try:
            self._all_players = players.get_players()
        except Exception:
            self._all_players = []

        try:
            active_players = players.get_active_players()
            self._active_players_map = {player['id']: player for player in active_players}
        except Exception:
            self._active_players_map = {}

    def _load_metadata_cache(self) -> None:
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, 'r', encoding='utf-8') as handle:
                    self._metadata_cache = json.load(handle)
            except Exception:
                self._metadata_cache = {}

    def _save_metadata_cache(self) -> None:
        try:
            with open(self.metadata_path, 'w', encoding='utf-8') as handle:
                json.dump(self._metadata_cache, handle, indent=2)
        except Exception:
            pass

    def _year_to_decade(self, year: int) -> Optional[str]:
        if year and year > 0:
            decade = (year // 10) * 10
            return f'{decade}s'
        return None

    def _player_profile_from_static(self, player: Dict, metadata: Optional[Dict] = None) -> PlayerProfile:
        active_data = self._active_players_map.get(player['id'], {})
        team_abbreviation = (metadata.get('team_abbreviation') if metadata else None) or active_data.get('team_abbreviation', 'N/A')
        position = (metadata.get('position') if metadata else None) or active_data.get('position', 'Unknown')

        return PlayerProfile(
            id=player['id'],
            full_name=player['full_name'],
            team_abbreviation=team_abbreviation or 'N/A',
            position=position or 'Unknown',
            rating=78.0,
            career_ppg=0.0,
            career_apg=0.0,
            career_rpg=0.0,
        )

    def _get_cached_metadata(self, player_id: int) -> Optional[Dict]:
        return self._metadata_cache.get(str(player_id))

    def get_player_metadata(self, player_id: int) -> Dict[str, Optional[str]]:
        str_id = str(player_id)
        cached = self._get_cached_metadata(player_id)
        if cached:
            return cached

        active_data = self._active_players_map.get(player_id, {})
        default = {
            'team_abbreviation': active_data.get('team_abbreviation', 'N/A'),
            'position': active_data.get('position', 'Unknown'),
            'from_year': None,
            'to_year': None,
        }

        try:
            info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
            frame = info.common_player_info.get_data_frame()
            if not frame.empty:
                record = frame.iloc[0].to_dict()
                from_year = int(record.get('FROM_YEAR')) if record.get('FROM_YEAR') else None
                to_year = int(record.get('TO_YEAR')) if record.get('TO_YEAR') else None
                metadata = {
                    'team_abbreviation': record.get('TEAM_ABBREVIATION') or default['team_abbreviation'],
                    'position': record.get('POSITION') or default['position'],
                    'from_year': from_year,
                    'to_year': to_year,
                }
            else:
                metadata = default
        except Exception:
            metadata = default

        self._metadata_cache[str_id] = metadata
        self._save_metadata_cache()
        return metadata

    def get_team_options(self) -> List[str]:
        try:
            return sorted({team['abbreviation'] for team in teams.get_teams() if team.get('abbreviation')})
        except Exception:
            return sorted({player.get('team_abbreviation', 'N/A') for player in self._active_players_map.values()})

    def get_position_options(self) -> List[str]:
        active_positions = {player.get('position') for player in self._active_players_map.values() if player.get('position')}
        fixed_positions = {'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F'}
        cleaned_positions = {position for position in active_positions if position and position.strip()}
        return sorted(cleaned_positions | fixed_positions)

    def _position_matches(self, filter_value: str, position_text: str) -> bool:
        filter_value = (filter_value or '').strip().lower()
        position_text = (position_text or '').strip().lower()
        if not filter_value or not position_text:
            return False
        if filter_value in position_text:
            return True

        mapping = {
            'pg': 'point guard',
            'sg': 'shooting guard',
            'sf': 'small forward',
            'pf': 'power forward',
            'c': 'center',
        }

        if filter_value in mapping and mapping[filter_value] in position_text:
            return True
        if filter_value in {'pg', 'sg', 'g'} and 'guard' in position_text:
            return True
        if filter_value in {'sf', 'pf', 'f'} and 'forward' in position_text:
            return True
        return False

    def get_era_options(self) -> List[str]:
        return [f'{decade}s' for decade in range(1950, 2030, 10)]

    def get_active_players(self, limit: int = 120) -> List[PlayerProfile]:
        if self._player_cache:
            return self._player_cache[:limit]

        self._player_cache = []
        for player in list(self._active_players_map.values())[:limit]:
            self._player_cache.append(PlayerProfile(
                id=player['id'],
                full_name=player['full_name'],
                team_abbreviation=player.get('team_abbreviation', 'N/A'),
                position=player.get('position', 'Unknown'),
                rating=80.0,
                career_ppg=0.0,
                career_apg=0.0,
                career_rpg=0.0,
            ))

        return self._player_cache

    def get_filtered_players(self, search: str = '', team_filter: str = '', position_filter: str = '', era_filter: str = '', limit: int = 120) -> List[PlayerProfile]:
        search_lower = search.lower()
        filtered: List[PlayerProfile] = []
        base_players = self._all_players

        if search_lower:
            base_players = [player for player in base_players if search_lower in player['full_name'].lower()]
        elif team_filter or position_filter or era_filter:
            cached_ids = {int(pid) for pid in self._metadata_cache.keys()}
            active_ids = set(self._active_players_map.keys())
            base_players = [player for player in base_players if player['id'] in active_ids or player['id'] in cached_ids]

        for player in base_players:
            if len(filtered) >= limit:
                break

            metadata = self._get_cached_metadata(player['id'])
            if (team_filter or position_filter or era_filter) and metadata is None:
                if player['id'] in self._active_players_map or search_lower:
                    metadata = self.get_player_metadata(player['id'])
                else:
                    continue

            if team_filter and metadata and metadata.get('team_abbreviation') != team_filter:
                continue
            if position_filter and metadata and not self._position_matches(position_filter, metadata.get('position', '')):
                continue
            if era_filter and metadata:
                era_start = int(era_filter[:4])
                era_end = era_start + 9
                from_year = metadata.get('from_year') or metadata.get('to_year') or 0
                to_year = metadata.get('to_year') or metadata.get('from_year') or 0
                if not (from_year <= era_end and to_year >= era_start):
                    continue

            filtered.append(self._player_profile_from_static(player, metadata))

        return filtered

    def get_player_profile(self, player_id: int) -> PlayerProfile:
        static_player = next((player for player in self._all_players if player['id'] == player_id), None)
        if static_player is None:
            raise ValueError('Player not found in NBA database.')

        metadata = self.get_player_metadata(player_id)
        stats = self.get_player_career_stats(player_id)
        rating = self._estimate_rating(stats)

        return PlayerProfile(
            id=player_id,
            full_name=static_player['full_name'],
            team_abbreviation=metadata.get('team_abbreviation', 'N/A'),
            position=metadata.get('position', 'Unknown'),
            rating=rating,
            career_ppg=stats.get('career_ppg', 0.0),
            career_apg=stats.get('career_apg', 0.0),
            career_rpg=stats.get('career_rpg', 0.0),
        )

    def get_player_career_stats(self, player_id: int) -> Dict[str, float]:
        try:
            career = playercareerstats.PlayerCareerStats(player_id=player_id)
            totals = career.career_totals_regular_season.get_data_frame()
            if totals.empty:
                return {
                    'career_ppg': 0.0,
                    'career_apg': 0.0,
                    'career_rpg': 0.0,
                }

            points = totals['PTS'].sum()
            assists = totals['AST'].sum()
            rebounds = totals['REB'].sum()
            games = totals['GP'].sum() or 1
            return {
                'career_ppg': round(points / games, 1),
                'career_apg': round(assists / games, 1),
                'career_rpg': round(rebounds / games, 1),
            }
        except Exception:
            return {
                'career_ppg': random.uniform(8.0, 24.0),
                'career_apg': random.uniform(1.5, 6.0),
                'career_rpg': random.uniform(2.0, 10.0),
            }

    def _estimate_rating(self, stats: Dict[str, float]) -> float:
        return round(70 + stats['career_ppg'] * 1.6 + stats['career_apg'] * 1.4 + stats['career_rpg'] * 1.2, 1)


class SimulationModel:
    def __init__(self, state_path: str = 'model_state.json'):
        self.state_path = state_path
        self.weights = {'rating_weight': 0.02, 'bias': 0.5}
        self.learning_rate = 0.004
        self._load_state()

    def _load_state(self) -> None:
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, 'r', encoding='utf-8') as handle:
                    self.weights = json.load(handle)
            except Exception:
                self.weights = {'rating_weight': 0.02, 'bias': 0.5}

    def _save_state(self) -> None:
        try:
            with open(self.state_path, 'w', encoding='utf-8') as handle:
                json.dump(self.weights, handle)
        except Exception:
            pass

    def predict(self, team_a: List[PlayerProfile], team_b: List[PlayerProfile]) -> Dict[str, float]:
        strength_a = sum(player.rating for player in team_a)
        strength_b = sum(player.rating for player in team_b)
        diff = (strength_a - strength_b) * self.weights['rating_weight'] + self.weights['bias']
        probability = self._sigmoid(diff)

        return {
            'team_a_win_probability': round(probability, 3),
            'expected_score_a': round(85 + strength_a * 0.18 + diff * 2, 1),
            'expected_score_b': round(85 + strength_b * 0.18 - diff * 2, 1),
        }

    def train(self, team_a: List[PlayerProfile], team_b: List[PlayerProfile], winner: str) -> None:
        prediction = self.predict(team_a, team_b)['team_a_win_probability']
        actual = 1.0 if winner == 'Team A' else 0.0
        error = actual - prediction
        strength_diff = sum(p.rating for p in team_a) - sum(p.rating for p in team_b)
        self.weights['rating_weight'] += self.learning_rate * error * strength_diff / 10.0
        self.weights['bias'] += self.learning_rate * error
        self.weights['rating_weight'] = max(-1.0, min(1.0, self.weights['rating_weight']))
        self.weights['bias'] = max(-2.0, min(2.0, self.weights['bias']))
        self._save_state()

    def _sigmoid(self, x: float) -> float:
        import math
        return 1 / (1 + math.exp(-x))


def simulate_game(team_a: List[PlayerProfile], team_b: List[PlayerProfile], model: SimulationModel) -> Dict:
    result = model.predict(team_a, team_b)
    team_a_stats = []
    team_b_stats = []

    def generate_stats(player: PlayerProfile):
        variance = random.uniform(0.75, 1.2)
        points = max(0, round(player.career_ppg * variance + random.uniform(-5, 5)))
        assists = max(0, round(player.career_apg * variance + random.uniform(-2, 2)))
        rebounds = max(0, round(player.career_rpg * variance + random.uniform(-3, 3)))
        steals = max(0, round(random.uniform(0, 3)))
        blocks = max(0, round(random.uniform(0, 3)))
        return {
            'name': player.full_name,
            'position': player.position,
            'team': player.team_abbreviation,
            'rating': player.rating,
            'points': points,
            'assists': assists,
            'rebounds': rebounds,
            'steals': steals,
            'blocks': blocks,
        }

    for player in team_a:
        stats = generate_stats(player)
        team_a_stats.append(stats)
    for player in team_b:
        stats = generate_stats(player)
        team_b_stats.append(stats)

    score_a = sum(player['points'] for player in team_a_stats)
    score_b = sum(player['points'] for player in team_b_stats)

    if score_a == score_b:
        winner = 'Team A' if result['team_a_win_probability'] >= 0.5 else 'Team B'
    else:
        winner = 'Team A' if score_a > score_b else 'Team B'

    model.train(team_a, team_b, winner)

    return {
        'winner': winner,
        'score_a': score_a,
        'score_b': score_b,
        'prediction': result,
        'model_weights': model.weights,
        'team_a_stats': team_a_stats,
        'team_b_stats': team_b_stats,
    }
