
package backend;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/recovery-events")
public class RecoveryEventController {

    private final RecoveryEventRepository eventRepository;

    public RecoveryEventController(
            RecoveryEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public List<RecoveryEvent> getAllEvents() {
        return eventRepository.findAll();
    }
}
