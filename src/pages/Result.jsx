import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import Card from '../components/Card';
import FeedbackCard from '../components/FeedbackCard';
import QuizCard from '../components/QuizCard';
import { generateExplanation, generateClarification, generateQuizQuestions } from '../services/gemini';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Result.css';

const Result = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const query = location.state?.query || "Learning";
    const quizMode = location.state?.quizMode || false;

    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [error, setError] = useState(null);
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0);

    const [displayTitle, setDisplayTitle] = useState(query);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

    // Dynamic loading messages
    const loadingMessages = [
        "Analyzing topic...",
        "Generating explanation...",
        "Preparing content...",
        "Almost done...",
        "Finalizing..."
    ];

    // Rotate loading messages every 3 seconds
    useEffect(() => {
        if (!loading) return;

        const interval = setInterval(() => {
            setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [loading, loadingMessages.length]);

    useEffect(() => {
        const fetchExplanation = async () => {
            setLoading(true);
            setLoadingMessageIndex(0); // Reset message index
            setError(null);

            try {
                // 1. Check Supabase history first
                const { data: cachedData, error: dbError } = await supabase
                    .from('history')
                    .select('*')
                    .eq('query', query)
                    .limit(1)
                    .maybeSingle();

                if (cachedData && cachedData.content) {
                    console.log("Loaded from cache:", query);
                    setCards(cachedData.content);
                    // Use saved clean topic if available (assuming we might save it in content or separate field later, 
                    // but for now we might just rely on the query or if we update schema. 
                    // Actually, let's just use the query for now if cached, or if we saved the clean title in the query field?
                    // Wait, if we save cleanTopic as 'query' in DB, then next time we search 'messy query' it won't match.
                    // Ideally we should have a separate title field. 
                    // For now, let's just use the query as title if cached, or maybe we can save the title in the content JSON?
                    // Let's assume content is just the cards array for now based on previous schema.
                    // To keep it simple without DB migration: we will just use the query as title for cached items, 
                    // OR we can try to extract title if we decide to wrap content in an object.
                    // BUT, the user wants the HISTORY title to be clean. 
                    // So when we save, we should save the CLEAN TOPIC as the 'query' field? 
                    // No, 'query' is what user searched. We should probably add a 'title' column to history table.
                    // Since I can't easily migrate DB right now without SQL, I will try to save the clean title 
                    // by updating the 'query' field itself? No, that breaks search.
                    // Let's just update the UI title for now.

                    // Actually, the user said "buat pada riwayat ... di tulis ulang". 
                    // This implies the sidebar list should show the clean title.
                    // The sidebar uses the 'query' column.
                    // So we MUST save the clean title in the 'query' column?
                    // If we do that, then 'messy query' won't find it next time?
                    // Maybe that's okay. If I search "romawi", and it saves as "Sejarah Romawi", 
                    // next time I search "romawi", it won't find "Sejarah Romawi" exactly?
                    // The current search is `.eq('query', query)`.

                    // Workaround: We will save the CLEAN TOPIC as the 'query' in the database.
                    // This means if I search "romawi" again, it might generate a new one if it doesn't match exactly.
                    // But that's acceptable for now to get the clean title in sidebar.

                    setDisplayTitle(cachedData.query); // Or just query
                    setLoading(false);
                    return;
                }

                // 2. If not in history, generate new
                const result = await generateExplanation(query);

                // Handle both old (array) and new (object) formats
                let explanationCards = [];
                let cleanTitle = query;

                if (Array.isArray(result)) {
                    explanationCards = result;
                } else if (result && result.cards) {
                    explanationCards = result.cards;
                    cleanTitle = result.cleanTopic || query;
                }

                setCards(explanationCards);
                setDisplayTitle(cleanTitle);

                // 3. Save to Supabase with CLEAN TITLE
                await saveToHistory(cleanTitle, explanationCards);

            } catch (err) {
                console.error("Failed to fetch explanation", err);
                setError(`Error: ${err.message || "Unknown error"}. Check console for details.`);
            } finally {
                setLoading(false);
            }
        };

        fetchExplanation();
    }, [query]);

    // Generate quiz questions after cards are loaded and quiz mode is on
    useEffect(() => {
        const fetchQuiz = async () => {
            if (!quizMode || cards.length === 0 || quizQuestions.length > 0) return;

            try {
                const questions = await generateQuizQuestions(query, 3);
                setQuizQuestions(questions);
            } catch (err) {
                console.error("Failed to generate quiz", err);
            }
        };

        fetchQuiz();
    }, [cards, quizMode, query, quizQuestions.length]);

    const maintainHistoryLimit = async () => {
        try {
            // Fetch IDs of all items, ordered by newest first
            const { data } = await supabase
                .from('history')
                .select('id')
                .order('created_at', { ascending: false });

            if (data && data.length > 10) {
                // Keep the first 10, delete the rest
                const itemsToDelete = data.slice(10).map(item => item.id);

                if (itemsToDelete.length > 0) {
                    await supabase
                        .from('history')
                        .delete()
                        .in('id', itemsToDelete);
                }
            }
        } catch (e) {
            console.error("Failed to maintain history limit", e);
        }
    };

    const saveToHistory = async (query, content) => {
        try {
            // Only save if user is logged in
            if (!user) {
                console.log('Guest user - not saving history');
                return;
            }

            // Check if already exists for this user
            const { data: existing } = await supabase
                .from('history')
                .select('id')
                .eq('query', query)
                .eq('user_id', user.id)
                .limit(1)
                .maybeSingle();

            if (existing) {
                // Update timestamp to move to top
                await supabase
                    .from('history')
                    .update({ created_at: new Date().toISOString(), content: content })
                    .eq('id', existing.id);
            } else {
                // Insert new with user_id
                const { error } = await supabase
                    .from('history')
                    .insert([
                        {
                            query,
                            content,
                            user_id: user.id
                        }
                    ]);
                if (error) throw error;
            }

            // Enforce limit
            await maintainHistoryLimit();

            // Trigger update in Sidebar
            window.dispatchEvent(new Event('historyUpdated'));
        } catch (e) {
            console.error("Failed to save history", e);
        }
    };

    const handleNext = () => {
        if (showQuiz && currentQuizIndex < quizQuestions.length - 1) {
            // Move to next quiz question
            setCurrentQuizIndex(prev => prev + 1);
        } else if (showQuiz) {
            // Finished all quiz questions
            navigate('/');
        } else if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (quizMode && quizQuestions.length > 0 && !showQuiz) {
            // Finished explanation cards, start quiz
            setShowQuiz(true);
            setCurrentQuizIndex(0);
        } else {
            setShowFeedback(true);
        }
    };

    const handleBack = () => {
        if (showQuiz && currentQuizIndex > 0) {
            setCurrentQuizIndex(prev => prev - 1);
        } else if (showQuiz) {
            // Go back to explanation cards
            setShowQuiz(false);
            setCurrentIndex(cards.length - 1);
        } else if (showFeedback) {
            setShowFeedback(false);
        } else if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            navigate('/');
        }
    };

    const handleHome = () => {
        navigate('/');
    };

    const handleQuizAnswer = (isCorrect) => {
        // Just log the answer, don't auto-advance
        console.log(`Answer was ${isCorrect ? 'correct' : 'incorrect'}`);
    };

    const handleFeedbackSubmit = async (type, text) => {
        if (type === 'understood') {
            navigate('/');
        } else if (type === 'confused') {
            setGenerating(true);
            try {
                // Generate clarification based on the specific confusion
                const clarification = await generateClarification(query, text);

                // Add clarification card after current cards
                setCards(prev => [...prev, clarification]);

                // Move to the new card
                setShowFeedback(false);
                setCurrentIndex(prev => prev + 1);
            } catch (err) {
                console.error("Failed to generate clarification", err);
                // Optionally handle error here
            } finally {
                setGenerating(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="result-container loading">
                <button onClick={handleHome} className="icon-button" aria-label="Home">
                    <Home size={24} />
                </button>
                <div className="loader"></div>
                <p className="loading-text">{loadingMessages[loadingMessageIndex]}</p>
                <p className="loading-subtext">Generating explanation for "{query}"</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="result-container loading">
                <p className="loading-text">{error}</p>
                <button onClick={() => navigate('/')} className="nav-button" style={{ marginTop: '1rem' }}>
                    <Home size={20} /> Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="result-container">
            <header className="result-header">
                <h1 className="topic-title">{displayTitle}</h1>
                <button onClick={handleHome} className="icon-button" aria-label="Home">
                    <Home size={24} />
                </button>
            </header>

            <div className="result-content">
                <AnimatePresence mode='wait'>
                    {generating ? (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="generating-loader"
                        >
                            <div className="loader small"></div>
                            <p>Clarifying...</p>
                        </motion.div>
                    ) : showQuiz ? (
                        <QuizCard
                            key={`quiz-${currentQuizIndex}`}
                            question={quizQuestions[currentQuizIndex]?.question}
                            type={quizQuestions[currentQuizIndex]?.type}
                            options={quizQuestions[currentQuizIndex]?.options}
                            correctAnswer={quizQuestions[currentQuizIndex]?.correctAnswer}
                            explanation={quizQuestions[currentQuizIndex]?.explanation}
                            onAnswer={handleQuizAnswer}
                        />
                    ) : showFeedback ? (
                        <FeedbackCard
                            key="feedback"
                            onSubmit={handleFeedbackSubmit}
                        />
                    ) : (
                        <Card
                            key={currentIndex}
                            title={cards[currentIndex]?.title}
                            content={cards[currentIndex]?.content}
                        />
                    )}
                </AnimatePresence>
            </div>

            <footer className="result-footer">
                <button
                    onClick={handleBack}
                    className="nav-button"
                    disabled={generating}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <div className="progress-indicators">
                    {cards.map((_, idx) => (
                        <div
                            key={idx}
                            className={`indicator ${!showFeedback && !showQuiz && idx === currentIndex ? 'active' : ''}`}
                        />
                    ))}
                    {quizMode && quizQuestions.map((_, idx) => (
                        <div
                            key={`quiz-${idx}`}
                            className={`indicator ${showQuiz && idx === currentQuizIndex ? 'active' : ''}`}
                            style={{ background: 'var(--accent)' }}
                        />
                    ))}
                    {!quizMode && <div className={`indicator feedback-indicator ${showFeedback ? 'active' : ''}`} />}
                </div>

                <button
                    onClick={handleNext}
                    className={`nav-button ${showFeedback ? 'hidden' : ''}`}
                    style={{ visibility: showFeedback ? 'hidden' : 'visible' }}
                    disabled={generating}
                >
                    Next
                    <ArrowRight size={20} />
                </button>
            </footer>
        </div>
    );
};

export default Result;
