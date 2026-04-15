import pytest
from app.meals import _parse_calorie_response


def test_plain_integer():
    assert _parse_calorie_response("650") == 650


def test_integer_with_surrounding_text():
    assert _parse_calorie_response("The meal contains approximately 650 calories.") == 650


def test_integer_with_units():
    assert _parse_calorie_response("650 kcal") == 650


def test_none_response():
    assert _parse_calorie_response(None) is None


def test_empty_string():
    assert _parse_calorie_response("") is None


def test_zero_response():
    assert _parse_calorie_response("0") is None


def test_negative_not_possible_via_regex():
    # regex matches digits only; a response like "-500" still extracts 500
    assert _parse_calorie_response("-500") == 500


def test_no_digits():
    assert _parse_calorie_response("I cannot estimate this meal.") is None


def test_picks_first_number():
    # If model returns a range or explanation with multiple numbers, take the first
    assert _parse_calorie_response("Between 600 and 700 kcal") == 600
