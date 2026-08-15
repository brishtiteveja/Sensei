export interface SolutionStep {
  title: string;
  content: string;
}

export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  solution: SolutionStep[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export interface QuestionDiscussion {
  id: string;
  user: { name: string; avatar: string; badge?: string };
  selectedText: string;
  userMessage: string;
  aiResponse: string;
  followUps: {
    id: string;
    user: { name: string; avatar: string };
    message: string;
    aiReply: string;
    timestamp: string;
  }[];
  likes: number;
  timestamp: string;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  colorName: string;
  gradient: [string, string];
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  sets: QuestionSet[];
}

export interface QuestionSet {
  id: string;
  name: string;
  year: string;
  questions: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completedBy: number;
  avgScore: number;
}

const questionsMap: Record<string, Question[]> = {
  default: [
    {
      id: 1,
      question:
        'A ball is thrown vertically upward with a velocity of 20 m/s. What is the maximum height reached? (g = 10 m/s²)',
      options: ['10 m', '15 m', '20 m', '25 m'],
      correct: 2,
      explanation:
        'Using v² = u² - 2gh, at max height v=0: 0 = 400 - 20h, h = 20m. The kinetic energy converts entirely to potential energy at the highest point.',
      solution: [
        {
          title: 'Given',
          content:
            'Initial velocity (u) = 20 m/s\nAcceleration (g) = 10 m/s² (downward)\nFinal velocity at max height (v) = 0 m/s',
        },
        {
          title: 'Formula',
          content: 'Using the kinematic equation:\nv² = u² − 2gh',
        },
        {
          title: 'Substitution',
          content: '0² = (20)² − 2(10)(h)\n0 = 400 − 20h',
        },
        { title: 'Solve', content: '20h = 400\nh = 400 / 20\nh = 20 m' },
        {
          title: 'Answer',
          content: 'The maximum height reached is 20 m ✓',
        },
      ],
      difficulty: 'Medium',
      topic: 'Kinematics',
    },
    {
      id: 2,
      question: 'Which of the following is a vector quantity?',
      options: ['Temperature', 'Mass', 'Velocity', 'Energy'],
      correct: 2,
      explanation:
        'Velocity has both magnitude and direction, making it a vector quantity. Temperature, mass, and energy are scalar quantities with only magnitude.',
      solution: [
        {
          title: 'Key Concept',
          content:
            'Scalar quantities have only magnitude.\nVector quantities have both magnitude and direction.',
        },
        {
          title: 'Analysis',
          content:
            '• Temperature → magnitude only → Scalar ✗\n• Mass → magnitude only → Scalar ✗\n• Velocity → magnitude + direction → Vector ✓\n• Energy → magnitude only → Scalar ✗',
        },
        {
          title: 'Answer',
          content:
            'Velocity is the vector quantity because it specifies both speed (how fast) and direction (which way).',
        },
      ],
      difficulty: 'Easy',
      topic: 'Vectors & Scalars',
    },
    {
      id: 3,
      question: 'The SI unit of electric current is:',
      options: ['Volt', 'Ohm', 'Ampere', 'Watt'],
      correct: 2,
      explanation:
        'Ampere (A) is the SI base unit of electric current. It is defined as the constant current that produces a force between two infinite parallel conductors.',
      solution: [
        {
          title: 'SI Base Units',
          content:
            'The 7 SI base units are:\nLength → metre (m)\nMass → kilogram (kg)\nTime → second (s)\nElectric current → Ampere (A)\nTemperature → Kelvin (K)\nAmount of substance → mole (mol)\nLuminous intensity → candela (cd)',
        },
        {
          title: 'Elimination',
          content:
            '• Volt (V) → unit of electric potential difference\n• Ohm (Ω) → unit of electrical resistance\n• Ampere (A) → unit of electric current ✓\n• Watt (W) → unit of power',
        },
        {
          title: 'Answer',
          content: 'Ampere (A) is the SI unit of electric current.',
        },
      ],
      difficulty: 'Easy',
      topic: 'Units & Measurements',
    },
    {
      id: 4,
      question: "Newton's third law of motion states that:",
      options: [
        'F = ma',
        'Every action has an equal and opposite reaction',
        'An object at rest stays at rest',
        'Force equals rate of change of momentum',
      ],
      correct: 1,
      explanation:
        "Newton's third law states that for every action force, there is an equal and opposite reaction force. These forces act on different objects.",
      solution: [
        {
          title: "Newton's Laws",
          content:
            '1st Law (Inertia): An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.\n\n2nd Law: F = ma (Force = mass × acceleration)\n\n3rd Law: Every action has an equal and opposite reaction.',
        },
        {
          title: 'Analysis of Options',
          content:
            '• F = ma → Newton\'s 2nd Law ✗\n• Equal & opposite reaction → Newton\'s 3rd Law ✓\n• Object at rest stays at rest → Newton\'s 1st Law ✗\n• F = dp/dt → Alternate form of 2nd Law ✗',
        },
        {
          title: 'Answer',
          content:
            "Newton's third law: Every action has an equal and opposite reaction. These action-reaction forces always act on different bodies.",
        },
      ],
      difficulty: 'Easy',
      topic: 'Laws of Motion',
    },
    {
      id: 5,
      question:
        'The phenomenon of total internal reflection occurs when light travels from:',
      options: [
        'Rarer to denser medium',
        'Denser to rarer medium',
        'Any medium to vacuum',
        'Vacuum to any medium',
      ],
      correct: 1,
      explanation:
        'Total internal reflection occurs when light travels from a denser medium to a rarer medium at an angle greater than the critical angle.',
      solution: [
        {
          title: 'Key Concept',
          content:
            'Total Internal Reflection (TIR) occurs when:\n1. Light travels from a denser medium to a rarer medium\n2. The angle of incidence exceeds the critical angle',
        },
        {
          title: 'Why denser → rarer?',
          content:
            'When light goes from denser to rarer medium, it bends away from the normal. At the critical angle, the refracted ray goes along the surface. Beyond the critical angle, no refraction occurs — only reflection.',
        },
        {
          title: 'Applications',
          content:
            '• Optical fibers\n• Diamond sparkle\n• Mirage formation\n• Prisms in binoculars',
        },
        {
          title: 'Answer',
          content: 'TIR occurs when light travels from a denser to a rarer medium ✓',
        },
      ],
      difficulty: 'Medium',
      topic: 'Optics',
    },
    {
      id: 6,
      question:
        'What is the value of acceleration due to gravity on the surface of the Moon approximately?',
      options: ['1.6 m/s²', '3.7 m/s²', '6.0 m/s²', '9.8 m/s²'],
      correct: 0,
      explanation:
        "The acceleration due to gravity on the Moon's surface is approximately 1.6 m/s², which is about 1/6th of Earth's gravity (9.8 m/s²).",
      solution: [
        {
          title: 'Known Values',
          content: "Earth's gravity (g₉) = 9.8 m/s²\nMoon's gravity ≈ g₉ / 6",
        },
        {
          title: 'Calculation',
          content: 'g_moon = 9.8 / 6 ≈ 1.63 m/s² ≈ 1.6 m/s²',
        },
        {
          title: 'Why is it less?',
          content:
            'The Moon has:\n• Less mass (1.2% of Earth)\n• Smaller radius (27% of Earth)\nSince g = GM/R², the smaller mass dominates, giving roughly 1/6th gravity.',
        },
        {
          title: 'Answer',
          content: 'The acceleration due to gravity on the Moon is approximately 1.6 m/s² ✓',
        },
      ],
      difficulty: 'Easy',
      topic: 'Gravitation',
    },
    {
      id: 7,
      question: 'Which color of light has the shortest wavelength?',
      options: ['Red', 'Green', 'Blue', 'Violet'],
      correct: 3,
      explanation:
        'Violet light has the shortest wavelength (~380-450 nm) in the visible spectrum. The order from longest to shortest is: Red, Orange, Yellow, Green, Blue, Indigo, Violet.',
      solution: [
        {
          title: 'Visible Spectrum',
          content:
            'VIBGYOR (from short to long wavelength):\nViolet: ~380–450 nm\nIndigo: ~450–485 nm\nBlue: ~485–500 nm\nGreen: ~500–565 nm\nYellow: ~565–590 nm\nOrange: ~590–625 nm\nRed: ~625–750 nm',
        },
        {
          title: 'Key Relationship',
          content:
            'Shorter wavelength = Higher frequency = Higher energy\nc = λf → as λ decreases, f increases',
        },
        {
          title: 'Answer',
          content: 'Violet has the shortest wavelength (~380 nm) among visible light colors ✓',
        },
      ],
      difficulty: 'Easy',
      topic: 'Optics',
    },
    {
      id: 8,
      question: "The dimensional formula of Planck's constant is:",
      options: ['[ML²T⁻¹]', '[MLT⁻²]', '[ML²T⁻²]', '[ML²T⁻³]'],
      correct: 0,
      explanation:
        "Planck's constant h has the unit J·s = kg·m²/s. Therefore, its dimensional formula is [ML²T⁻¹].",
      solution: [
        {
          title: "Planck's Constant",
          content: 'h has the unit: Joule × second (J·s)',
        },
        {
          title: 'Dimensional Analysis',
          content:
            'Energy (E) = [ML²T⁻²]\nTime (T) = [T]\n\nh = E × T = [ML²T⁻²] × [T]\nh = [ML²T⁻¹]',
        },
        {
          title: 'Verification',
          content:
            'E = hf → h = E/f\nUnit: J / Hz = J·s = kg·m²/s\nDimension: [ML²T⁻¹] ✓',
        },
        {
          title: 'Answer',
          content: "The dimensional formula of Planck's constant is [ML²T⁻¹] ✓",
        },
      ],
      difficulty: 'Hard',
      topic: 'Dimensional Analysis',
    },
    {
      id: 9,
      question:
        'In a parallel plate capacitor, if the distance between the plates is doubled, the capacitance:',
      options: ['Doubles', 'Halves', 'Remains same', 'Quadruples'],
      correct: 1,
      explanation:
        'Capacitance C = ε₀A/d. When distance d is doubled, C becomes half. Capacitance is inversely proportional to the distance between plates.',
      solution: [
        {
          title: 'Formula',
          content:
            'Capacitance of a parallel plate capacitor:\nC = ε₀A / d\nwhere ε₀ = permittivity, A = plate area, d = distance',
        },
        {
          title: 'When d → 2d',
          content: "C' = ε₀A / (2d) = (1/2) × (ε₀A/d) = C/2",
        },
        {
          title: 'Conclusion',
          content:
            'C is inversely proportional to d.\nDoubling d → C becomes half.\n\nPhysically: greater separation weakens the electric field between plates, reducing charge storage capacity.',
        },
        {
          title: 'Answer',
          content: 'The capacitance halves when the distance is doubled ✓',
        },
      ],
      difficulty: 'Medium',
      topic: 'Electrostatics',
    },
    {
      id: 10,
      question:
        'The work done in moving a charge along an equipotential surface is:',
      options: ['Maximum', 'Minimum', 'Zero', 'Infinity'],
      correct: 2,
      explanation:
        'Work done = q × ΔV. Since the potential is the same everywhere on an equipotential surface, ΔV = 0, and therefore work done is zero.',
      solution: [
        {
          title: 'Definition',
          content:
            'An equipotential surface is a surface where the electric potential (V) is the same at every point.',
        },
        {
          title: 'Work Done Formula',
          content:
            'W = qΔV = q(V₂ − V₁)\nOn an equipotential surface: V₁ = V₂\nSo ΔV = 0',
        },
        {
          title: 'Therefore',
          content:
            'W = q × 0 = 0\n\nNo work is done because the electric field is always perpendicular to the equipotential surface. Movement along the surface is perpendicular to the force.',
        },
        { title: 'Answer', content: 'The work done is zero ✓' },
      ],
      difficulty: 'Medium',
      topic: 'Electrostatics',
    },
  ],
};

export function getQuestionsForSet(setId: string): Question[] {
  return questionsMap[setId] || questionsMap.default;
}

const discussionsMap: Record<string, QuestionDiscussion[]> = {
  '1': [
    {
      id: 'd1a',
      user: { name: 'Rafiq Ahmed', avatar: 'RA', badge: 'Top Contributor' },
      selectedText: 'v² = u² - 2gh',
      userMessage:
        'Can someone explain why we use v² = u² - 2gh instead of h = ut + ½at²?',
      aiResponse:
        'Great question! Both formulas can be used, but v² = u² - 2gh is preferred here because we know the initial velocity (u = 20 m/s), final velocity at max height (v = 0), and acceleration (g = 10 m/s²). The equation h = ut + ½at² would require us to first find the time, adding an extra step. Using v² = u² - 2gh directly eliminates the time variable, making the calculation more efficient.',
      followUps: [
        {
          id: 'f1',
          user: { name: 'Nusrat Jahan', avatar: 'NJ' },
          message: 'So both give the same answer right?',
          aiReply:
            'Yes! Using h = ut + ½at²: First find t = u/g = 20/10 = 2s, then h = 20(2) - ½(10)(4) = 40 - 20 = 20m. Same answer, just takes longer!',
          timestamp: '2h ago',
        },
      ],
      likes: 24,
      timestamp: '3h ago',
    },
    {
      id: 'd1b',
      user: { name: 'Kamal Uddin', avatar: 'KU' },
      selectedText: 'maximum height',
      userMessage:
        'What if air resistance is considered? Would the max height be more or less?',
      aiResponse:
        'With air resistance, the maximum height would be LESS. Air resistance acts as an additional downward force during the upward journey, so the ball decelerates faster. The effective deceleration becomes (g + a_air) instead of just g. This means the ball reaches v=0 sooner and at a lower height. In real-world scenarios, the actual height would be noticeably less than 20m.',
      followUps: [],
      likes: 11,
      timestamp: '1d ago',
    },
  ],
  '2': [
    {
      id: 'd2a',
      user: { name: 'Tanvir Hasan', avatar: 'TH' },
      selectedText: 'vector quantity',
      userMessage:
        "What's the easiest way to remember which quantities are vectors vs scalars?",
      aiResponse:
        "Here's a simple trick: Vector quantities always answer 'which direction?' If you can ask 'in which direction?' and it makes sense, it's a vector.\n\nCommon Vectors: Velocity, Acceleration, Force, Displacement, Momentum\nCommon Scalars: Speed, Mass, Temperature, Energy, Time, Distance\n\nRemember: Speed is scalar, but Velocity is vector (speed + direction). Similarly, Distance is scalar, but Displacement is vector.",
      followUps: [
        {
          id: 'f2',
          user: { name: 'Anika Rahman', avatar: 'AR' },
          message:
            'Is electric current a vector or scalar? It has direction through wire...',
          aiReply:
            'Excellent observation! Despite having direction, electric current is actually a scalar quantity. It does not follow vector addition rules (like the parallelogram law). Current is defined as the rate of flow of charge (I = dQ/dt), which is scalar.',
          timestamp: '1h ago',
        },
      ],
      likes: 31,
      timestamp: '5h ago',
    },
  ],
  '3': [
    {
      id: 'd3a',
      user: { name: 'Sabrina Akter', avatar: 'SA', badge: 'Premium' },
      selectedText: 'SI base unit',
      userMessage:
        'How many SI base units are there and is Ampere really a base unit?',
      aiResponse:
        'There are exactly 7 SI base units, and yes, Ampere is one of them! The 7 base units are: metre (m), kilogram (kg), second (s), Ampere (A), Kelvin (K), mole (mol), and candela (cd). All other units like Volt, Ohm, and Watt are derived from these base units. For example, Volt = kg·m²/(A·s³).',
      followUps: [],
      likes: 15,
      timestamp: '6h ago',
    },
  ],
  '5': [
    {
      id: 'd5a',
      user: { name: 'Farhan Islam', avatar: 'FI' },
      selectedText: 'total internal reflection',
      userMessage:
        "Why doesn't TIR happen when light goes from rarer to denser medium?",
      aiResponse:
        'When light goes from a rarer to denser medium (like air to glass), it bends toward the normal. The refraction angle is always less than the incidence angle, so the refracted ray can never go along or beyond the surface.\n\nBut when light goes from denser to rarer medium (glass to air), it bends away from the normal. As the incidence angle increases, the refraction angle reaches 90° (critical angle). Beyond this angle, there is no refracted ray at all — all light reflects back. That\'s TIR!',
      followUps: [
        {
          id: 'f5',
          user: { name: 'Mehedi Haque', avatar: 'MH' },
          message: 'How do we calculate the critical angle?',
          aiReply:
            'The critical angle θc can be found using Snell\'s law: n₁ sinθc = n₂ sin90° → sinθc = n₂/n₁. For glass to air: sinθc = 1/1.5 = 0.667, so θc ≈ 41.8°. Any angle of incidence greater than 41.8° will produce TIR.',
          timestamp: '4h ago',
        },
      ],
      likes: 18,
      timestamp: '1d ago',
    },
  ],
  '8': [
    {
      id: 'd8a',
      user: { name: 'Sabrina Akter', avatar: 'SA', badge: 'Premium' },
      selectedText: 'dimensional formula',
      userMessage:
        'How do I quickly derive dimensional formulas during the exam?',
      aiResponse:
        "Here's a systematic approach for quick derivation:\n\nStep 1: Write the formula involving the quantity\nStep 2: Replace each term with its dimensions\nStep 3: Simplify\n\nFor Planck's constant: E = hf → h = E/f\n- Energy [E] = Force × Distance = [MLT⁻²][L] = [ML²T⁻²]\n- Frequency [f] = [T⁻¹]\n- h = [ML²T⁻²] / [T⁻¹] = [ML²T⁻¹]\n\nQuick tip: Memorize these 5 base dimensions and you can derive anything:\n- Force = [MLT⁻²]\n- Energy = [ML²T⁻²]\n- Power = [ML²T⁻³]\n- Pressure = [ML⁻¹T⁻²]\n- Charge = [AT]",
      followUps: [
        {
          id: 'f8',
          user: { name: 'Kamal Uddin', avatar: 'KU' },
          message: 'Does this approach work for BUET questions too?',
          aiReply:
            'Absolutely! BUET frequently tests dimensional analysis. They often ask tricky questions like "which pair has the same dimensions?" — knowing the base dimensions helps you compare quickly. For example, Work and Torque both have dimensions [ML²T⁻²] even though they are physically different!',
          timestamp: '6h ago',
        },
      ],
      likes: 42,
      timestamp: '2d ago',
    },
  ],
  '9': [
    {
      id: 'd9a',
      user: { name: 'Mehedi Haque', avatar: 'MH' },
      selectedText: 'capacitance',
      userMessage:
        'What happens to the energy stored if we double the distance while keeping charge constant?',
      aiResponse:
        'When distance doubles with charge Q constant:\n- C becomes C/2 (as we discussed)\n- V = Q/C, so V doubles (becomes 2V)\n- Energy U = Q²/(2C), so U doubles!\n\nBut wait — where does the extra energy come from? When you pull the plates apart, you do work against the attractive electric force between them. This work gets stored as additional electrical energy. It\'s like stretching a spring — you put energy in by pulling!',
      followUps: [],
      likes: 15,
      timestamp: '3d ago',
    },
  ],
  '10': [
    {
      id: 'd10a',
      user: { name: 'Nusrat Jahan', avatar: 'NJ' },
      selectedText: 'equipotential surface',
      userMessage: 'Can you give a real-life example of an equipotential surface?',
      aiResponse:
        'Sure! The surface of any charged conducting sphere is an equipotential surface — every point on the surface has the same electric potential. Another example: the surface of the Earth is approximately equipotential for gravity. That\'s why water settles to a level surface — it naturally arranges itself along equipotential surfaces. In maps, contour lines connecting points of equal height are gravitational equipotential lines!',
      followUps: [],
      likes: 9,
      timestamp: '5d ago',
    },
  ],
};

export function getDiscussionsForQuestion(questionId: number): QuestionDiscussion[] {
  return discussionsMap[String(questionId)] || [];
}

export const universities: University[] = [
  {
    id: 'du',
    name: 'Dhaka University',
    shortName: 'DU',
    colorName: 'indigo',
    gradient: ['#6366f1', '#2563eb'],
    subjects: [
      {
        id: 'physics',
        name: 'Physics',
        icon: '⚛️',
        sets: [
          { id: 'du-phy-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Hard', completedBy: 2340, avgScore: 68 },
          { id: 'du-phy-b', name: 'Set B', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1890, avgScore: 72 },
          { id: 'du-phy-c', name: 'Set C', year: '2023-24', questions: 10, difficulty: 'Hard', completedBy: 3100, avgScore: 65 },
        ],
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        icon: '⚗️',
        sets: [
          { id: 'du-chem-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 2100, avgScore: 74 },
          { id: 'du-chem-b', name: 'Set B', year: '2023-24', questions: 10, difficulty: 'Hard', completedBy: 2800, avgScore: 67 },
        ],
      },
      {
        id: 'math',
        name: 'Mathematics',
        icon: '📐',
        sets: [
          { id: 'du-math-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Hard', completedBy: 1500, avgScore: 62 },
          { id: 'du-math-b', name: 'Set B', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1200, avgScore: 71 },
        ],
      },
      {
        id: 'bangla',
        name: 'Bangla',
        icon: '📖',
        sets: [
          { id: 'du-bng-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Easy', completedBy: 3400, avgScore: 82 },
        ],
      },
      {
        id: 'english',
        name: 'English',
        icon: '🇬🇧',
        sets: [
          { id: 'du-eng-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 2900, avgScore: 76 },
        ],
      },
    ],
  },
  {
    id: 'ru',
    name: 'Rajshahi University',
    shortName: 'RU',
    colorName: 'emerald',
    gradient: ['#10b981', '#0d9488'],
    subjects: [
      {
        id: 'physics',
        name: 'Physics',
        icon: '⚛️',
        sets: [
          { id: 'ru-phy-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1800, avgScore: 73 },
          { id: 'ru-phy-b', name: 'Set B', year: '2023-24', questions: 10, difficulty: 'Hard', completedBy: 2200, avgScore: 66 },
        ],
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        icon: '⚗️',
        sets: [
          { id: 'ru-chem-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1600, avgScore: 70 },
        ],
      },
      {
        id: 'biology',
        name: 'Biology',
        icon: '🧬',
        sets: [
          { id: 'ru-bio-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Easy', completedBy: 2100, avgScore: 79 },
        ],
      },
    ],
  },
  {
    id: 'buet',
    name: 'BUET',
    shortName: 'BUET',
    colorName: 'amber',
    gradient: ['#f59e0b', '#ea580c'],
    subjects: [
      {
        id: 'math',
        name: 'Mathematics',
        icon: '📐',
        sets: [
          { id: 'buet-math-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Hard', completedBy: 3200, avgScore: 58 },
          { id: 'buet-math-b', name: 'Set B', year: '2024-25', questions: 10, difficulty: 'Hard', completedBy: 2800, avgScore: 55 },
        ],
      },
      {
        id: 'physics',
        name: 'Physics',
        icon: '⚛️',
        sets: [
          { id: 'buet-phy-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Hard', completedBy: 2900, avgScore: 61 },
        ],
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        icon: '⚗️',
        sets: [
          { id: 'buet-chem-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 2400, avgScore: 69 },
        ],
      },
    ],
  },
  {
    id: 'cu',
    name: 'Chittagong University',
    shortName: 'CU',
    colorName: 'rose',
    gradient: ['#f43f5e', '#db2777'],
    subjects: [
      {
        id: 'physics',
        name: 'Physics',
        icon: '⚛️',
        sets: [
          { id: 'cu-phy-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1400, avgScore: 74 },
        ],
      },
      {
        id: 'bangla',
        name: 'Bangla',
        icon: '📖',
        sets: [
          { id: 'cu-bng-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Easy', completedBy: 1800, avgScore: 81 },
        ],
      },
    ],
  },
  {
    id: 'ju',
    name: 'Jahangirnagar University',
    shortName: 'JU',
    colorName: 'violet',
    gradient: ['#8b5cf6', '#9333ea'],
    subjects: [
      {
        id: 'physics',
        name: 'Physics',
        icon: '⚛️',
        sets: [
          { id: 'ju-phy-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Medium', completedBy: 1100, avgScore: 71 },
        ],
      },
      {
        id: 'english',
        name: 'English',
        icon: '🇬🇧',
        sets: [
          { id: 'ju-eng-a', name: 'Set A', year: '2024-25', questions: 10, difficulty: 'Easy', completedBy: 1500, avgScore: 78 },
        ],
      },
    ],
  },
];

export const leaderboardData = [
  { rank: 1, name: 'Nusrat Jahan', avatar: 'NJ', score: 9850, streak: 45, accuracy: 94, badge: '🏆' },
  { rank: 2, name: 'Arif Rahman', avatar: 'AR', score: 9420, streak: 38, accuracy: 91, badge: '🥈' },
  { rank: 3, name: 'Tasnim Akter', avatar: 'TA', score: 9180, streak: 32, accuracy: 89, badge: '🥉' },
  { rank: 4, name: 'Mehedi Hasan', avatar: 'MH', score: 8760, streak: 28, accuracy: 87, badge: '' },
  { rank: 5, name: 'Farhana Islam', avatar: 'FI', score: 8540, streak: 25, accuracy: 86, badge: '' },
  { rank: 6, name: 'Rahul Ahmed', avatar: 'RA', score: 8320, streak: 22, accuracy: 84, badge: '' },
  { rank: 7, name: 'Sadia Afrin', avatar: 'SA', score: 8100, streak: 20, accuracy: 83, badge: '' },
  { rank: 8, name: 'Imran Khan', avatar: 'IK', score: 7890, streak: 18, accuracy: 81, badge: '' },
  { rank: 9, name: 'Riya Sultana', avatar: 'RS', score: 7650, streak: 15, accuracy: 80, badge: '' },
  { rank: 10, name: 'Tanvir Ahmed', avatar: 'TA2', score: 7420, streak: 14, accuracy: 79, badge: '' },
  { rank: 11, name: 'Mithila Rahman', avatar: 'MR', score: 7200, streak: 12, accuracy: 78, badge: '' },
  { rank: 12, name: 'Sabbir Hossain', avatar: 'SH', score: 6980, streak: 10, accuracy: 76, badge: '' },
];

export const aiResponses: string[] = [
  'Great question! Let me explain this concept step by step.\n\nThe key principle here involves understanding the fundamental relationship between the variables. When we examine this carefully:\n\n1. First, identify the given information\n2. Apply the relevant formula or theorem\n3. Solve systematically\n\nThis approach works for most problems you\'ll encounter in university admission exams. Would you like me to provide a practice problem?',
  'This is a common topic in admission tests! Here\'s a clear breakdown:\n\nCore Concept: The underlying principle is based on well-established theories that you\'ll find across multiple textbook chapters.\n\nKey Points to Remember:\n• Always start with the basic definition\n• Relate it to real-world examples\n• Practice with previous year questions\n\nFor DU and BUET exams specifically, this topic appears frequently. Shall I share some sample questions?',
  'Excellent topic for exam preparation! Let me help you understand this thoroughly.\n\nThe concept can be broken down into three main parts:\n\nPart 1: Understanding the theoretical foundation\nPart 2: Applying it to numerical problems\nPart 3: Connecting it with related concepts\n\nI\'d recommend solving at least 20-30 practice problems on this topic. Studies show that spaced repetition helps retain this knowledge for exams. Want me to create a study plan?',
  'This is one of the most important topics for university admissions! Here\'s what you need to know:\n\n📌 Definition: Start with the formal definition and understand each term.\n\n📌 Applications: This concept is applied in various real-world scenarios including engineering and scientific research.\n\n📌 Exam Tips:\n- Questions often test conceptual understanding\n- Numerical problems are common in BUET exams\n- DU focuses more on theoretical aspects\n\nWould you like me to test you on this topic?',
];
