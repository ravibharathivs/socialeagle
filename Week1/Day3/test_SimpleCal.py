import unittest
from SimpleCal import calc

class TestSimpleCal(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(calc(2, 3, '+'), 5)
        self.assertEqual(calc(-1, 1, '+'), 0)
        self.assertEqual(calc(0, 0, '+'), 0)

    def test_subtraction(self):
        self.assertEqual(calc(5, 3, '-'), 2)
        self.assertEqual(calc(1, 1, '-'), 0)
        self.assertEqual(calc(0, 5, '-'), -5)

    def test_multiplication(self):
        self.assertEqual(calc(2, 3, '*'), 6)
        self.assertEqual(calc(-2, 3, '*'), -6)
        self.assertEqual(calc(0, 5, '*'), 0)

    def test_division(self):
        self.assertEqual(calc(6, 3, '/'), 2.0)
        self.assertEqual(calc(5, 2, '/'), 2.5)
        with self.assertRaises(ZeroDivisionError):
            calc(5, 0, '/')

    def test_invalid_operator(self):
        self.assertIsNone(calc(2, 3, '%'))
        self.assertIsNone(calc(2, 3, 'invalid'))

if __name__ == '__main__':
    unittest.main() 